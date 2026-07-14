-- Modelo final de cobrança: responses_monthly_limit passa a ser a COTA MENSAL.
-- Mensal 300/mês · Semestral 500/mês (3.000 no semestre) · Anual 1.000/mês (12.000 no ano).
-- Extras de 20% da cota a R$ 2,00; trava mensal em cota+extras (lógica em src/lib/billing.ts).
UPDATE subscriptions SET responses_monthly_limit = CASE plan_type
  WHEN 'mensal' THEN 300
  WHEN 'semestral' THEN 500
  WHEN 'anual' THEN 1000
  WHEN 'trial' THEN 50
  ELSE 300 END;
