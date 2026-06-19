-- Habilitar pg_cron (executar no Supabase Dashboard → Extensions se não estiver ativo)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Função: marcar ações vencidas como 'atrasada'
CREATE OR REPLACE FUNCTION mark_overdue_actions()
RETURNS void AS $$
  UPDATE actions
  SET status = 'atrasada', updated_at = now()
  WHERE due_date < CURRENT_DATE
    AND status NOT IN ('concluida', 'atrasada');
$$ LANGUAGE sql;

-- Função: expirar tokens de avaliação vencidos e notificar (placeholder — notificação via Edge Function)
CREATE OR REPLACE FUNCTION expire_assessment_tokens()
RETURNS void AS $$
  UPDATE assessment_tokens
  SET status = 'expirado'
  WHERE expires_at < now()
    AND status = 'ativo';
$$ LANGUAGE sql;

-- Agendamentos via pg_cron (descomentar após habilitar extensão no Supabase)
-- SELECT cron.schedule('mark-overdue-actions', '0 1 * * *', 'SELECT mark_overdue_actions()');
-- SELECT cron.schedule('expire-assessment-tokens', '*/5 * * * *', 'SELECT expire_assessment_tokens()');

-- ============================================================
-- SEED: Programas padrão do catálogo
-- ============================================================
INSERT INTO programs (name, description, type) VALUES
  ('Programa de Escuta Ativa', 'Treinamento de líderes e equipes em técnicas de escuta ativa e comunicação não-violenta.', 'padrao'),
  ('Treinamento de Liderança Saudável', 'Capacitação de gestores para práticas de liderança que promovam bem-estar psicológico.', 'padrao'),
  ('Programa de Gestão do Estresse', 'Intervenções individuais e coletivas para identificação e manejo do estresse ocupacional.', 'padrao'),
  ('Promoção do Equilíbrio Trabalho-Vida', 'Políticas e ações para reduzir sobrecarga e promover qualidade de vida no trabalho.', 'padrao'),
  ('Programa de Prevenção ao Assédio', 'Treinamentos, canais de denúncia e protocolos de apuração de assédio moral e sexual.', 'padrao'),
  ('Fortalecimento do Suporte Social', 'Ações para fortalecer redes de apoio entre colegas e com a liderança.', 'padrao'),
  ('Programa de Reconhecimento e Valorização', 'Práticas de reconhecimento do trabalho que promovam engajamento e pertencimento.', 'padrao'),
  ('Readequação de Demandas e Carga de Trabalho', 'Revisão de processos, distribuição de tarefas e metas para adequação da carga laboral.', 'padrao'),
  ('Programa de Saúde Mental no Trabalho', 'Oferta de suporte psicológico, rodas de conversa e campanhas de conscientização.', 'padrao'),
  ('Melhoria da Autonomia e Controle do Trabalho', 'Ações para ampliar a participação dos trabalhadores nas decisões que afetam seu trabalho.', 'padrao'),
  ('Programa de Integração e Onboarding', 'Processo estruturado de integração de novos colaboradores para reduzir insegurança e isolamento.', 'padrao'),
  ('Canal de Comunicação Transparente', 'Implantação de canais abertos de comunicação entre liderança e equipes.', 'padrao'),
  ('Programa de Desenvolvimento de Competências', 'Capacitações e trilhas de aprendizado para reduzir insegurança quanto ao desempenho.', 'padrao');
