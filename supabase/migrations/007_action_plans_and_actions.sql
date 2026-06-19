CREATE TABLE action_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsible TEXT NOT NULL,
  due_date DATE NOT NULL,
  type action_type NOT NULL DEFAULT 'preventiva',
  status action_status NOT NULL DEFAULT 'pendente',
  factor_id TEXT,
  risk_level risk_level,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE evidences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Action Plans
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_plans: admin gerencia"
  ON action_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "action_plans: visualizador lê"
  ON action_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Actions
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actions: admin gerencia"
  ON actions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "actions: visualizador lê"
  ON actions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Evidences
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidences: admin gerencia"
  ON evidences FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "evidences: visualizador lê"
  ON evidences FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Índices
CREATE INDEX idx_action_plans_assessment_id ON action_plans(assessment_id);
CREATE INDEX idx_actions_plan_id ON actions(plan_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_evidences_action_id ON evidences(action_id);
