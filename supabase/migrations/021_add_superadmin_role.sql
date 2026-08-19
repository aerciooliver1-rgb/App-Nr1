-- Multitenant (multitelas): passo 1/2 — apenas adiciona o valor 'superadmin' ao enum
-- user_role. Precisa ser commitado sozinho: Postgres não permite usar um valor de
-- enum recém-criado na mesma transação em que ele foi adicionado.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
