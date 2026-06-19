CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs são append-only — sem UPDATE ou DELETE
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs: admin lê"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Inserção via service role apenas (sem policy de INSERT para usuários)

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
