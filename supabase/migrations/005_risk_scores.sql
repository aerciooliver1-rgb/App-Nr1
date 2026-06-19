CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  factor_id TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  level risk_level NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assessment_id, factor_id)
);

ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_scores: admin lê e escreve"
  ON risk_scores FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "risk_scores: visualizador lê"
  ON risk_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_risk_scores_assessment_id ON risk_scores(assessment_id);
