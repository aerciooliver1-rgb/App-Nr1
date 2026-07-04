-- Identifica o respondente dentro de uma avaliação (Modo A: um índice por gestor;
-- Modo B: um índice por colaborador anônimo). Permite múltiplas respostas sem sobrescrita.
ALTER TABLE assessment_answers ADD COLUMN IF NOT EXISTS respondent_index INTEGER NOT NULL DEFAULT 1;
