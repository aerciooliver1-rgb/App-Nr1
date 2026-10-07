-- Solicitações de demonstração vindas da landing page (site/ — projeto estático
-- separado, sem backend próprio). O formulário insere direto aqui pela REST API
-- do Supabase usando a chave anon, então a política de escrita é aberta
-- (qualquer um insere, sem exigir sessão) e a de leitura é fechada (zero
-- policies de SELECT) — só a service role lê, pela tela /demonstracoes do
-- superadmin. Mesmo padrão de "RLS habilitado, sem nenhuma policy de leitura"
-- já usado em impersonation_sessions (migration 024).

CREATE TABLE demo_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz
);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_requests: qualquer um solicita" ON demo_requests
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_demo_requests_created_at ON demo_requests(created_at DESC);
