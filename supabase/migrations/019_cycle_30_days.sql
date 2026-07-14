-- Contagem por ciclos de 30 DIAS a partir da ativação do plano (period_start),
-- não por mês-calendário. Sem assinatura: fallback para o mês corrente.
CREATE OR REPLACE FUNCTION count_monthly_responses(p_user_id UUID)
RETURNS INTEGER AS $$
  WITH cycle AS (
    SELECT COALESCE(
      (SELECT s.period_start::timestamptz
         + (GREATEST(0, floor(extract(epoch FROM (now() - s.period_start::timestamptz)) / 2592000))::int
            * interval '30 days')
       FROM subscriptions s WHERE s.user_id = p_user_id),
      date_trunc('month', now())
    ) AS start_at
  )
  SELECT COUNT(*)::int
  FROM assessment_answers aa
  JOIN assessments a ON a.id = aa.assessment_id, cycle c
  WHERE a.created_by = p_user_id
    AND aa.question_id = (SELECT MIN(question_id) FROM question_meta)
    AND aa.created_at >= c.start_at;
$$ LANGUAGE sql SECURITY DEFINER;
