-- Conteúdo detalhado dos programas (seções do Manual HumanizaRH)
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS objectives TEXT,
  ADD COLUMN IF NOT EXISTS structure TEXT,
  ADD COLUMN IF NOT EXISTS methodology TEXT,
  ADD COLUMN IF NOT EXISTS materials TEXT,
  ADD COLUMN IF NOT EXISTS reference_norms TEXT,
  ADD COLUMN IF NOT EXISTS partner_profile TEXT,
  ADD COLUMN IF NOT EXISTS indicators TEXT;
