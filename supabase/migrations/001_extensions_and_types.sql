-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos enumerados
CREATE TYPE user_role AS ENUM ('admin', 'colaborador', 'visualizador');
CREATE TYPE assessment_mode AS ENUM ('A', 'B');
CREATE TYPE assessment_status AS ENUM ('rascunho', 'em_coleta', 'concluido', 'calculado');
CREATE TYPE token_status AS ENUM ('ativo', 'expirado', 'encerrado');
CREATE TYPE risk_level AS ENUM ('baixo', 'moderado', 'alto', 'critico');
CREATE TYPE action_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'atrasada');
CREATE TYPE approval_status AS ENUM ('aprovado', 'com_ressalvas', 'em_revisao');
CREATE TYPE program_type AS ENUM ('padrao', 'personalizado');
CREATE TYPE action_type AS ENUM ('preventiva', 'corretiva');
