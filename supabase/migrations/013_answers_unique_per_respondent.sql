-- A unicidade por (assessment_id, question_id) impedia múltiplos respondentes
-- na mesma avaliação (segundo colaborador do Modo B falhava ao enviar).
-- Passa a ser única por respondente.
ALTER TABLE assessment_answers DROP CONSTRAINT IF EXISTS assessment_answers_assessment_id_question_id_key;
ALTER TABLE assessment_answers ADD CONSTRAINT assessment_answers_unique_per_respondent
  UNIQUE (assessment_id, question_id, respondent_index);
