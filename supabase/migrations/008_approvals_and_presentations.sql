CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  status approval_status NOT NULL,
  approved_by TEXT NOT NULL,
  notes TEXT,
  approved_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  pptx_url TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- RLS Approvals
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals: admin e visualizador inserem"
  ON approvals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "approvals: todos autenticados lêem"
  ON approvals FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Presentations
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presentations: admin gerencia"
  ON presentations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "presentations: visualizador lê"
  ON presentations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Índices
CREATE INDEX idx_approvals_plan_id ON approvals(plan_id);
CREATE INDEX idx_presentations_assessment_id ON presentations(assessment_id);
