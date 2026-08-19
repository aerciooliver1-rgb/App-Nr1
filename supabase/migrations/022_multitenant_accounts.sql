-- Multitenant (multitelas): passo 2/2 — isolamento de dados por cliente (SaaS).
--
-- Hoje toda tabela libera leitura a "qualquer autenticado" e escrita a "qualquer
-- perfil com role='admin'" — sem checar dono. Como todo cadastro novo nasce com
-- role='admin' (handle_new_user), um segundo cliente veria/editaria os dados de
-- todos os outros. Este migration introduz o conceito de "conta" (tenant): agrupa
-- profiles (equipe) + companies (empresas avaliadas) + subscriptions (plano) e
-- reescreve as policies de RLS para escopar por conta, mantendo um papel
-- 'superadmin' (só a plataforma) que enxerga tudo.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) Tabela accounts (tenant)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) account_id nas tabelas "raiz" (companies, programs, subscriptions) +
--    profiles.account_id (toda conta agrupa 1+ profiles)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE programs ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) Backfill: conta única para o perfil existente (Aercio), promovido a
--    superadmin. Dados de demonstração (4 empresas, 1 assinatura) ficam nela.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM profiles ORDER BY created_at LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    INSERT INTO accounts (owner_id) VALUES (v_profile_id) RETURNING id INTO v_account_id;

    UPDATE profiles SET account_id = v_account_id, role = 'superadmin' WHERE id = v_profile_id;
    UPDATE companies SET account_id = v_account_id WHERE account_id IS NULL;
    UPDATE subscriptions SET account_id = v_account_id WHERE account_id IS NULL;
  END IF;
END $$;

ALTER TABLE companies ALTER COLUMN account_id SET NOT NULL;
-- profiles.account_id fica nullable por segurança operacional (ex.: um perfil órfão
-- não deve travar login), mas handle_new_user sempre preenche em cadastros novos.

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) Funções helper (mesmo padrão de is_admin(): SQL, STABLE, SECURITY DEFINER,
--    search_path fixo — ver migration 020, security hardening)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
$$;

CREATE OR REPLACE FUNCTION my_account_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Resolve a conta dona de um setor / avaliação / plano / ação, subindo a cadeia
-- de FKs já existente (company_id → sector_id → assessment_id → plan_id → action_id).
CREATE OR REPLACE FUNCTION sector_account_id(p_sector_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.account_id FROM sectors s JOIN companies c ON c.id = s.company_id WHERE s.id = p_sector_id
$$;

CREATE OR REPLACE FUNCTION assessment_account_id(p_assessment_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT sector_account_id(a.sector_id) FROM assessments a WHERE a.id = p_assessment_id
$$;

CREATE OR REPLACE FUNCTION plan_account_id(p_plan_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT assessment_account_id(ap.assessment_id) FROM action_plans ap WHERE ap.id = p_plan_id
$$;

CREATE OR REPLACE FUNCTION action_account_id(p_action_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT plan_account_id(a.plan_id) FROM actions a WHERE a.id = p_action_id
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5) handle_new_user(): cadastro novo sem account_id nos metadados cria a
--    própria conta (é o "dono" pagante); convidado (Configurações → Usuários)
--    vem com account_id + role do time que o convidou.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_account_id uuid := (NEW.raw_user_meta_data->>'account_id')::uuid;
  v_role user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'admin');
BEGIN
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (owner_id) VALUES (NEW.id) RETURNING id INTO v_account_id;
    v_role := 'admin';
  END IF;

  INSERT INTO profiles (id, full_name, role, account_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    v_account_id
  );
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6) count_monthly_responses → escopado por conta (mantém o ciclo rolante de
--    30 dias a partir de subscriptions.period_start, migration 019)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION count_monthly_responses_account(p_account_id uuid)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH cycle AS (
    SELECT COALESCE(
      (SELECT s.period_start::timestamptz
         + (GREATEST(0, floor(extract(epoch FROM (now() - s.period_start::timestamptz)) / 2592000))::int
            * interval '30 days')
       FROM subscriptions s WHERE s.account_id = p_account_id),
      date_trunc('month', now())
    ) AS start_at
  )
  SELECT COUNT(*)::int
  FROM assessment_answers aa
  JOIN assessments a ON a.id = aa.assessment_id
  JOIN profiles p ON p.id = a.created_by, cycle c
  WHERE p.account_id = p_account_id
    AND (p_account_id = my_account_id() OR auth.uid() IS NULL OR is_superadmin())
    AND aa.question_id = (SELECT MIN(question_id) FROM question_meta)
    AND aa.created_at >= c.start_at;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7) RLS — remove todas as policies antigas (padrão "role=admin sem dono" /
--    "auth.uid() IS NOT NULL") e recria escopadas por conta.
-- ═══════════════════════════════════════════════════════════════════════════

-- accounts
CREATE POLICY "accounts: superadmin gerencia" ON accounts FOR ALL USING (is_superadmin());
CREATE POLICY "accounts: membro lê a própria" ON accounts FOR SELECT USING (id = my_account_id());

-- profiles
DROP POLICY IF EXISTS "profiles: admin lê todos" ON profiles;
DROP POLICY IF EXISTS "profiles: usuário atualiza o próprio perfil" ON profiles;
DROP POLICY IF EXISTS "profiles: usuário lê o próprio perfil" ON profiles;

CREATE POLICY "profiles: lê a própria conta" ON profiles FOR SELECT
  USING (is_superadmin() OR auth.uid() = id OR account_id = my_account_id());
CREATE POLICY "profiles: usuário atualiza o próprio perfil" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "profiles: admin da conta atualiza a equipe" ON profiles FOR UPDATE
  USING (is_superadmin() OR (account_id = my_account_id() AND my_role() = 'admin'));

-- companies
DROP POLICY IF EXISTS "companies: admin gerencia as próprias" ON companies;
DROP POLICY IF EXISTS "companies: visualizador lê" ON companies;

CREATE POLICY "companies: lê a própria conta" ON companies FOR SELECT
  USING (is_superadmin() OR account_id = my_account_id());
CREATE POLICY "companies: admin/colaborador insere" ON companies FOR INSERT
  WITH CHECK (is_superadmin() OR (account_id = my_account_id() AND my_role() IN ('admin', 'colaborador')));
CREATE POLICY "companies: admin/colaborador atualiza" ON companies FOR UPDATE
  USING (is_superadmin() OR (account_id = my_account_id() AND my_role() IN ('admin', 'colaborador')));
CREATE POLICY "companies: admin exclui" ON companies FOR DELETE
  USING (is_superadmin() OR (account_id = my_account_id() AND my_role() = 'admin'));

-- sectors (via companies.account_id)
DROP POLICY IF EXISTS "sectors: admin gerencia" ON sectors;
DROP POLICY IF EXISTS "sectors: visualizador lê" ON sectors;

CREATE POLICY "sectors: lê a própria conta" ON sectors FOR SELECT
  USING (is_superadmin() OR (SELECT account_id FROM companies WHERE id = sectors.company_id) = my_account_id());
CREATE POLICY "sectors: admin/colaborador insere" ON sectors FOR INSERT
  WITH CHECK (is_superadmin() OR ((SELECT account_id FROM companies WHERE id = sectors.company_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));
CREATE POLICY "sectors: admin/colaborador atualiza" ON sectors FOR UPDATE
  USING (is_superadmin() OR ((SELECT account_id FROM companies WHERE id = sectors.company_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));
CREATE POLICY "sectors: admin exclui" ON sectors FOR DELETE
  USING (is_superadmin() OR ((SELECT account_id FROM companies WHERE id = sectors.company_id) = my_account_id() AND my_role() = 'admin'));

-- assessments (via sector_account_id)
DROP POLICY IF EXISTS "assessments: admin gerencia" ON assessments;
DROP POLICY IF EXISTS "assessments: visualizador lê" ON assessments;

CREATE POLICY "assessments: lê a própria conta" ON assessments FOR SELECT
  USING (is_superadmin() OR sector_account_id(sector_id) = my_account_id());
CREATE POLICY "assessments: admin/colaborador gerencia" ON assessments FOR ALL
  USING (is_superadmin() OR (sector_account_id(sector_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- assessment_tokens (via assessment_account_id) — sem policy p/ anon: validação via service role
DROP POLICY IF EXISTS "tokens: admin gerencia" ON assessment_tokens;

CREATE POLICY "tokens: lê a própria conta" ON assessment_tokens FOR SELECT
  USING (is_superadmin() OR assessment_account_id(assessment_id) = my_account_id());
CREATE POLICY "tokens: admin/colaborador gerencia" ON assessment_tokens FOR ALL
  USING (is_superadmin() OR (assessment_account_id(assessment_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- assessment_answers (via assessment_account_id) — inserção anônima (Modo B) via service role
DROP POLICY IF EXISTS "answers: admin lê e escreve" ON assessment_answers;

CREATE POLICY "answers: lê e escreve a própria conta" ON assessment_answers FOR ALL
  USING (is_superadmin() OR (assessment_account_id(assessment_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));
CREATE POLICY "answers: visualizador lê" ON assessment_answers FOR SELECT
  USING (is_superadmin() OR assessment_account_id(assessment_id) = my_account_id());

-- risk_scores (via assessment_account_id) — escrita real é via calculate_risk_scores_sql (SECURITY DEFINER)
DROP POLICY IF EXISTS "risk_scores: admin lê e escreve" ON risk_scores;
DROP POLICY IF EXISTS "risk_scores: visualizador lê" ON risk_scores;

CREATE POLICY "risk_scores: lê a própria conta" ON risk_scores FOR SELECT
  USING (is_superadmin() OR assessment_account_id(assessment_id) = my_account_id());
CREATE POLICY "risk_scores: admin/colaborador gerencia" ON risk_scores FOR ALL
  USING (is_superadmin() OR (assessment_account_id(assessment_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- programs (padrão continua global/leitura livre; só superadmin cria/edita/exclui padrão;
-- personalizado segue a regra normal de conta)
DROP POLICY IF EXISTS "programs: admin cria e edita personalizados" ON programs;
DROP POLICY IF EXISTS "programs: admin gerencia" ON programs;
DROP POLICY IF EXISTS "programs: todos autenticados lêem" ON programs;

CREATE POLICY "programs: lê padrão ou a própria conta" ON programs FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_superadmin() OR type = 'padrao' OR account_id = my_account_id()));
CREATE POLICY "programs: gerencia padrão ou personalizado da conta" ON programs FOR ALL
  USING (
    is_superadmin()
    OR (type = 'personalizado' AND account_id = my_account_id() AND my_role() IN ('admin', 'colaborador'))
  );

-- interventions (escopo segue a avaliação, não o programa — programa pode ser padrão/global)
DROP POLICY IF EXISTS "interventions: admin gerencia" ON interventions;

CREATE POLICY "interventions: lê a própria conta" ON interventions FOR SELECT
  USING (is_superadmin() OR assessment_account_id(assessment_id) = my_account_id());
CREATE POLICY "interventions: admin/colaborador gerencia" ON interventions FOR ALL
  USING (is_superadmin() OR (assessment_account_id(assessment_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- action_plans (via assessment_account_id)
DROP POLICY IF EXISTS "action_plans: admin gerencia" ON action_plans;
DROP POLICY IF EXISTS "action_plans: visualizador lê" ON action_plans;

CREATE POLICY "action_plans: lê a própria conta" ON action_plans FOR SELECT
  USING (is_superadmin() OR assessment_account_id(assessment_id) = my_account_id());
CREATE POLICY "action_plans: admin/colaborador gerencia" ON action_plans FOR ALL
  USING (is_superadmin() OR (assessment_account_id(assessment_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- actions (via plan_account_id)
DROP POLICY IF EXISTS "actions: admin gerencia" ON actions;
DROP POLICY IF EXISTS "actions: visualizador lê" ON actions;

CREATE POLICY "actions: lê a própria conta" ON actions FOR SELECT
  USING (is_superadmin() OR plan_account_id(plan_id) = my_account_id());
CREATE POLICY "actions: admin/colaborador gerencia" ON actions FOR ALL
  USING (is_superadmin() OR (plan_account_id(plan_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- evidences (via action_account_id) — troca também o policy set solto do hardening
-- (evidences_select/insert/delete, que hoje liberam leitura geral e escrita por dono)
DROP POLICY IF EXISTS "evidences: admin gerencia" ON evidences;
DROP POLICY IF EXISTS "evidences: visualizador lê" ON evidences;
DROP POLICY IF EXISTS "evidences_delete" ON evidences;
DROP POLICY IF EXISTS "evidences_insert" ON evidences;
DROP POLICY IF EXISTS "evidences_select" ON evidences;

CREATE POLICY "evidences: lê a própria conta" ON evidences FOR SELECT
  USING (is_superadmin() OR action_account_id(action_id) = my_account_id());
CREATE POLICY "evidences: admin/colaborador gerencia" ON evidences FOR ALL
  USING (is_superadmin() OR (action_account_id(action_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- approvals (via plan_account_id)
DROP POLICY IF EXISTS "approvals: admin e visualizador inserem" ON approvals;
DROP POLICY IF EXISTS "approvals: todos autenticados lêem" ON approvals;

CREATE POLICY "approvals: lê a própria conta" ON approvals FOR SELECT
  USING (is_superadmin() OR plan_account_id(plan_id) = my_account_id());
CREATE POLICY "approvals: admin/colaborador insere" ON approvals FOR INSERT
  WITH CHECK (is_superadmin() OR (plan_account_id(plan_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- presentations (via assessment_account_id)
DROP POLICY IF EXISTS "presentations: admin gerencia" ON presentations;
DROP POLICY IF EXISTS "presentations: visualizador lê" ON presentations;

CREATE POLICY "presentations: lê a própria conta" ON presentations FOR SELECT
  USING (is_superadmin() OR assessment_account_id(assessment_id) = my_account_id());
CREATE POLICY "presentations: admin/colaborador gerencia" ON presentations FOR ALL
  USING (is_superadmin() OR (assessment_account_id(assessment_id) = my_account_id() AND my_role() IN ('admin', 'colaborador')));

-- subscriptions (billing por conta)
DROP POLICY IF EXISTS "users_view_own_subscription" ON subscriptions;

CREATE POLICY "subscriptions: lê a própria conta" ON subscriptions FOR SELECT
  USING (is_superadmin() OR account_id = my_account_id());

ALTER TABLE subscriptions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_account_id_key UNIQUE (account_id);

-- audit_logs (superadmin vê tudo; admin da conta vê a trilha da própria conta)
DROP POLICY IF EXISTS "audit_logs: admin lê" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs: sistema insere" ON audit_logs;

CREATE POLICY "audit_logs: lê a própria conta" ON audit_logs FOR SELECT
  USING (is_superadmin() OR (account_id = my_account_id() AND my_role() = 'admin'));
CREATE POLICY "audit_logs: admin insere" ON audit_logs FOR INSERT
  WITH CHECK (is_superadmin() OR is_admin());

-- Índices para os novos joins de RLS
CREATE INDEX idx_companies_account_id ON companies(account_id);
CREATE INDEX idx_profiles_account_id ON profiles(account_id);
CREATE INDEX idx_programs_account_id ON programs(account_id) WHERE account_id IS NOT NULL;
