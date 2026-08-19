-- Remove a função por-usuário substituída por count_monthly_responses_account
-- (migration 022) — nenhuma chamada no app depende mais dela.
DROP FUNCTION IF EXISTS count_monthly_responses(uuid);
