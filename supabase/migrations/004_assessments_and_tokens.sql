CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  mode assessment_mode NOT NULL DEFAULT 'A',
  status assessment_status NOT NULL DEFAULT 'rascunho',
  cycle INTEGER NOT NULL DEFAULT 1 CHECK (cycle >= 1),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assessment_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  status token_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assessment_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  factor_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  clinical_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);

-- RLS Assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessments: admin gerencia"
  ON assessments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "assessments: visualizador lê"
  ON assessments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Tokens (sem RLS para leitura pública — validação via service role)
ALTER TABLE assessment_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tokens: admin gerencia"
  ON assessment_tokens FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- RLS Answers
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answers: admin lê e escreve"
  ON assessment_answers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Respostas anônimas (Modo B) são inseridas via service role — não precisam de policy de usuário anônimo

-- Índices
CREATE INDEX idx_assessments_sector_id ON assessments(sector_id);
CREATE INDEX idx_assessment_answers_assessment_id ON assessment_answers(assessment_id);
CREATE INDEX idx_assessment_tokens_token ON assessment_tokens(token);
