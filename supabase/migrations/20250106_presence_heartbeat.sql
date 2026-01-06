-- ===============================================
-- Premium Presence System - Heartbeat & Cleanup
-- ===============================================
-- Comportamento tipo WhatsApp/Discord:
-- - Utilizadores são marcados offline após 60s de inatividade
-- - pg_cron verifica a cada 1 minuto

-- ===============================================
-- 1. Função RPC para marcar utilizadores inativos como offline
-- ===============================================
CREATE OR REPLACE FUNCTION public.check_stale_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Marcar como offline todos os utilizadores que:
  -- 1. Estão com status diferente de 'offline'
  -- 2. Têm last_seen_at há mais de 60 segundos
  UPDATE profiles
  SET 
    status = 'offline',
    last_seen_at = NOW()
  WHERE 
    status != 'offline'
    AND last_seen_at < NOW() - INTERVAL '60 seconds';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.check_stale_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_stale_presence() TO service_role;

-- ===============================================
-- 2. Função RPC para heartbeat (chamada pelo cliente)
-- ===============================================
CREATE OR REPLACE FUNCTION public.presence_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.presence_heartbeat() TO authenticated;

-- ===============================================
-- 3. pg_cron Job para cleanup automático a cada 1 minuto
-- ===============================================
-- NOTA: pg_cron precisa estar habilitado no Supabase Dashboard:
-- Database → Extensions → pg_cron → Enable

-- Criar o cron job (executa a cada 1 minuto)
SELECT cron.schedule(
  'cleanup-stale-presence',           -- nome do job
  '* * * * *',                        -- cron expression: a cada minuto
  $$SELECT public.check_stale_presence()$$
);

-- ===============================================
-- 4. Verificar se o job foi criado (opcional)
-- ===============================================
-- Para listar todos os jobs: SELECT * FROM cron.job;
-- Para remover o job: SELECT cron.unschedule('cleanup-stale-presence');
