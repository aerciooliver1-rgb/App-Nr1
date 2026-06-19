CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type program_type NOT NULL DEFAULT 'padrao',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  factor_id TEXT NOT NULL,
  program_id UUID NOT NULL REFERENCES programs(id),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assessment_id, factor_id, program_id)
);

-- RLS Programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs: todos autenticados lêem"
  ON programs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "programs: admin cria e edita personalizados"
  ON programs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- RLS Interventions
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interventions: admin gerencia"
  ON interventions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Índices
CREATE INDEX idx_programs_type ON programs(type);
CREATE INDEX idx_programs_created_by ON programs(created_by);
CREATE INDEX idx_interventions_assessment_id ON interventions(assessment_id);
