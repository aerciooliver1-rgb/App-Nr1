-- Suporte: "Entrar como" — permite ao superadmin abrir uma sessão real dentro
-- da conta de um cliente (dashboard, empresas etc. funcionam normalmente,
-- porque a sessão do navegador passa a ser a do próprio dono da conta).
--
-- A tabela nunca é acessada pelo cliente autenticado (RLS habilitado, zero
-- policies = negado por padrão) — só o server role, via server actions em
-- src/app/actions/impersonation.ts, cria/lê/encerra essas sessões. O token é
-- opaco (32 bytes aleatórios) e guardado num cookie httpOnly; validar por
-- ele no banco evita que alguém forje a própria "volta" para virar superadmin.

CREATE TABLE impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  superadmin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_impersonation_sessions_active_token
  ON impersonation_sessions(token) WHERE ended_at IS NULL;
