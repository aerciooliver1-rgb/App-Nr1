-- Escala para até 6.000 respondentes/mês e modelo de cobrança por respostas.

-- 1) Metadados das questões (espelho de src/lib/data/questions.ts) para cálculo em SQL
CREATE TABLE IF NOT EXISTS question_meta (
  question_id TEXT PRIMARY KEY,
  factor_id TEXT NOT NULL,
  inversao BOOLEAN NOT NULL
);

INSERT INTO question_meta (question_id, factor_id, inversao) VALUES
  ('F01Q01', 'F01', false),
  ('F01Q02', 'F01', false),
  ('F01Q03', 'F01', false),
  ('F01Q04', 'F01', true),
  ('F01Q05', 'F01', true),
  ('F02Q01', 'F02', true),
  ('F02Q02', 'F02', true),
  ('F02Q03', 'F02', false),
  ('F02Q04', 'F02', true),
  ('F03Q01', 'F03', true),
  ('F03Q02', 'F03', false),
  ('F03Q03', 'F03', true),
  ('F03Q04', 'F03', true),
  ('F04Q01', 'F04', true),
  ('F04Q02', 'F04', false),
  ('F04Q03', 'F04', true),
  ('F04Q04', 'F04', true),
  ('F05Q01', 'F05', true),
  ('F05Q02', 'F05', true),
  ('F05Q03', 'F05', true),
  ('F05Q04', 'F05', true),
  ('F06Q01', 'F06', true),
  ('F06Q02', 'F06', false),
  ('F06Q03', 'F06', true),
  ('F06Q04', 'F06', true),
  ('F07Q01', 'F07', true),
  ('F07Q02', 'F07', false),
  ('F07Q03', 'F07', true),
  ('F08Q01', 'F08', false),
  ('F08Q02', 'F08', true),
  ('F08Q03', 'F08', true),
  ('F09Q01', 'F09', false),
  ('F09Q02', 'F09', false),
  ('F09Q03', 'F09', false),
  ('F10Q01', 'F10', false),
  ('F10Q02', 'F10', false),
  ('F10Q03', 'F10', false),
  ('F10Q04', 'F10', true),
  ('F10Q05', 'F10', false),
  ('F11Q01', 'F11', false),
  ('F11Q02', 'F11', true),
  ('F11Q03', 'F11', false),
  ('F11Q04', 'F11', true),
  ('F12Q01', 'F12', false),
  ('F12Q02', 'F12', true),
  ('F12Q03', 'F12', true),
  ('F13Q01', 'F13', false),
  ('F13Q02', 'F13', true),
  ('F13Q03', 'F13', true),
  ('F13Q04', 'F13', true)
ON CONFLICT (question_id) DO UPDATE SET factor_id = EXCLUDED.factor_id, inversao = EXCLUDED.inversao;

-- 2) Cálculo de risco dentro do banco (evita transferir até 300k linhas para o app)
CREATE OR REPLACE FUNCTION calculate_risk_scores_sql(p_assessment_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM risk_scores WHERE assessment_id = p_assessment_id;

  INSERT INTO risk_scores (assessment_id, factor_id, score, level)
  SELECT
    p_assessment_id,
    f.factor_id,
    f.score,
    (CASE
      WHEN f.score <= 25 THEN 'baixo'
      WHEN f.score <= 50 THEN 'moderado'
      WHEN f.score <= 75 THEN 'alto'
      ELSE 'critico'
    END)::risk_level
  FROM (
    SELECT qm.factor_id, ROUND(AVG(q.qscore)::numeric, 2) AS score
    FROM (
      SELECT aa.question_id,
        CASE WHEN qm2.inversao
          THEN ((5 - AVG(aa.score)) / 4.0) * 100
          ELSE ((AVG(aa.score) - 1) / 4.0) * 100
        END AS qscore
      FROM assessment_answers aa
      JOIN question_meta qm2 ON qm2.question_id = aa.question_id
      WHERE aa.assessment_id = p_assessment_id
      GROUP BY aa.question_id, qm2.inversao
    ) q
    JOIN question_meta qm ON qm.question_id = q.question_id
    GROUP BY qm.factor_id
  ) f;

  UPDATE assessments SET status = 'calculado', updated_at = now() WHERE id = p_assessment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Uso mensal de respostas (1 resposta = 1 questionário completo respondido)
CREATE OR REPLACE FUNCTION count_monthly_responses(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::int
  FROM assessment_answers aa
  JOIN assessments a ON a.id = aa.assessment_id
  WHERE a.created_by = p_user_id
    AND aa.question_id = (SELECT MIN(question_id) FROM question_meta)
    AND aa.created_at >= date_trunc('month', now());
$$ LANGUAGE sql SECURITY DEFINER;

-- 4) Índice para contagens mensais por questão
CREATE INDEX IF NOT EXISTS idx_answers_question_created
  ON assessment_answers (question_id, created_at);

-- 5) Assinaturas passam a limitar RESPOSTAS mensais (300 / 1200 / 3000)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS responses_monthly_limit INTEGER NOT NULL DEFAULT 300;

UPDATE subscriptions SET responses_monthly_limit = CASE plan_type
  WHEN 'mensal' THEN 300
  WHEN 'semestral' THEN 1200
  WHEN 'anual' THEN 3000
  WHEN 'trial' THEN 50
  ELSE 300 END;
