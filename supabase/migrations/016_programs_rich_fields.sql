-- Campos do Manual de Programas HumanizaRH (carga horária, prazo, público, modalidade, encontros, fatores NR-1, nível)
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS workload TEXT,
  ADD COLUMN IF NOT EXISTS start_deadline TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS modality TEXT,
  ADD COLUMN IF NOT EXISTS sessions TEXT,
  ADD COLUMN IF NOT EXISTS factor_ids TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT;
