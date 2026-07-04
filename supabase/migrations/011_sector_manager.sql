-- Gerente(s) responsável(is) pelo setor — texto livre, permite múltiplos nomes
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS manager_name TEXT;
