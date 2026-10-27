-- Avisa o app assim que uma solicitação de demonstração é gravada (pelo site,
-- via insert anônimo — ver migration 026), pra mandar um e-mail instantâneo
-- pro superadmin em vez de depender de alguém abrir o /demonstracoes.
--
-- pg_net faz a chamada HTTP de forma assíncrona (não trava o insert do
-- visitante do site esperando o e-mail sair). O segredo compartilhado (mesmo
-- padrão do HOTMART_HOTTOK) fica no Supabase Vault, não em texto puro aqui —
-- cadastrado à parte via `vault.create_secret(...)`, nunca commitado no repo.
-- A mesma string também precisa estar na Vercel como DEMO_REQUEST_WEBHOOK_SECRET.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_demo_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'demo_request_webhook_secret';

  IF v_secret IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://app-psi-lake-85.vercel.app/api/webhooks/demo-request',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-demo-request-secret', v_secret
      ),
      body := jsonb_build_object(
        'id', NEW.id,
        'full_name', NEW.full_name,
        'email', NEW.email,
        'whatsapp', NEW.whatsapp,
        'created_at', NEW.created_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_demo_request
  AFTER INSERT ON demo_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_demo_request();
