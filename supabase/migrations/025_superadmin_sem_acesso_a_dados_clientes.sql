-- Superadmin (plataforma) deixa de enxergar os dados operacionais dos clientes.
--
-- Antes, todas as policies de leitura/escrita das tabelas de dados tinham
-- `is_superadmin() OR ...`, então o superadmin via empresas, setores, avaliações,
-- respostas e planos de TODAS as contas. Agora cada conta vê só o próprio
-- conteúdo; o superadmin só mantém:
--   • catálogo padrão (programs.type = 'padrao')
--   • contas (accounts) e leitura do plano (subscriptions)
--   • trilha de auditoria (audit_logs) — tela Changelog
-- Para ver a tela de um cliente continua existindo "Entrar como"
-- (impersonation_sessions), que troca a sessão para a do dono da conta.

-- ─── Tabelas de dados do cliente: remove o bypass do superadmin ─────────────
-- Gerado a partir do estado atual de pg_policies (substitui "(is_superadmin() OR "
-- por "(" mantendo a expressão original da conta).

ALTER POLICY "action_plans: admin/colaborador gerencia" ON public.action_plans USING (((assessment_account_id(assessment_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "action_plans: lê a própria conta" ON public.action_plans USING ((assessment_account_id(assessment_id) = my_account_id()));

ALTER POLICY "actions: admin/colaborador gerencia" ON public.actions USING (((plan_account_id(plan_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "actions: lê a própria conta" ON public.actions USING ((plan_account_id(plan_id) = my_account_id()));

ALTER POLICY "approvals: admin/colaborador insere" ON public.approvals WITH CHECK (((plan_account_id(plan_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "approvals: lê a própria conta" ON public.approvals USING ((plan_account_id(plan_id) = my_account_id()));

ALTER POLICY "answers: lê e escreve a própria conta" ON public.assessment_answers USING (((assessment_account_id(assessment_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "answers: visualizador lê" ON public.assessment_answers USING ((assessment_account_id(assessment_id) = my_account_id()));

ALTER POLICY "tokens: admin/colaborador gerencia" ON public.assessment_tokens USING (((assessment_account_id(assessment_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "tokens: lê a própria conta" ON public.assessment_tokens USING ((assessment_account_id(assessment_id) = my_account_id()));

ALTER POLICY "assessments: admin/colaborador gerencia" ON public.assessments USING (((sector_account_id(sector_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "assessments: lê a própria conta" ON public.assessments USING ((sector_account_id(sector_id) = my_account_id()));

ALTER POLICY "companies: admin exclui" ON public.companies USING (((account_id = my_account_id()) AND (my_role() = 'admin'::user_role)));
ALTER POLICY "companies: admin/colaborador atualiza" ON public.companies USING (((account_id = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "companies: admin/colaborador insere" ON public.companies WITH CHECK (((account_id = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "companies: lê a própria conta" ON public.companies USING ((account_id = my_account_id()));

ALTER POLICY "evidences: admin/colaborador gerencia" ON public.evidences USING (((action_account_id(action_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "evidences: lê a própria conta" ON public.evidences USING ((action_account_id(action_id) = my_account_id()));

ALTER POLICY "interventions: admin/colaborador gerencia" ON public.interventions USING (((assessment_account_id(assessment_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "interventions: lê a própria conta" ON public.interventions USING ((assessment_account_id(assessment_id) = my_account_id()));

ALTER POLICY "presentations: admin/colaborador gerencia" ON public.presentations USING (((assessment_account_id(assessment_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "presentations: lê a própria conta" ON public.presentations USING ((assessment_account_id(assessment_id) = my_account_id()));

ALTER POLICY "profiles: admin da conta atualiza a equipe" ON public.profiles USING (((account_id = my_account_id()) AND (my_role() = 'admin'::user_role)));
ALTER POLICY "profiles: lê a própria conta" ON public.profiles USING ((auth.uid() = id) OR (account_id = my_account_id()));

ALTER POLICY "risk_scores: admin/colaborador gerencia" ON public.risk_scores USING (((assessment_account_id(assessment_id) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "risk_scores: lê a própria conta" ON public.risk_scores USING ((assessment_account_id(assessment_id) = my_account_id()));

ALTER POLICY "sectors: admin exclui" ON public.sectors USING (((( SELECT companies.account_id FROM companies WHERE (companies.id = sectors.company_id)) = my_account_id()) AND (my_role() = 'admin'::user_role)));
ALTER POLICY "sectors: admin/colaborador atualiza" ON public.sectors USING (((( SELECT companies.account_id FROM companies WHERE (companies.id = sectors.company_id)) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "sectors: admin/colaborador insere" ON public.sectors WITH CHECK (((( SELECT companies.account_id FROM companies WHERE (companies.id = sectors.company_id)) = my_account_id()) AND (my_role() = ANY (ARRAY['admin'::user_role, 'colaborador'::user_role]))));
ALTER POLICY "sectors: lê a própria conta" ON public.sectors USING ((( SELECT companies.account_id FROM companies WHERE (companies.id = sectors.company_id)) = my_account_id()));

-- ─── Assinatura: superadmin não lê o plano de cada conta via RLS ────────────
-- (a tela /contas passa a ler via service role, só agregados/identificação)
ALTER POLICY "subscriptions: lê a própria conta" ON public.subscriptions USING (account_id = my_account_id());

-- ─── Catálogo: superadmin gerencia só o padrão; personalizados são da conta ─
DROP POLICY IF EXISTS "programs: gerencia padrão ou personalizado da conta" ON programs;
DROP POLICY IF EXISTS "programs: lê padrão ou a própria conta" ON programs;

CREATE POLICY "programs: gerencia padrão ou personalizado da conta" ON programs FOR ALL
  USING (
    (is_superadmin() AND type = 'padrao')
    OR (type = 'personalizado' AND account_id = my_account_id() AND my_role() IN ('admin', 'colaborador'))
  );

CREATE POLICY "programs: lê padrão ou a própria conta" ON programs FOR SELECT
  USING (auth.uid() IS NOT NULL AND (type = 'padrao' OR account_id = my_account_id()));
