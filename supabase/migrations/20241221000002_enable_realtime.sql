-- ============================================================
-- ATIVAR REALTIME PARA TODAS AS TABELAS NECESSÁRIAS
-- ============================================================
-- Executar isto no Supabase Dashboard -> SQL Editor

-- 1. Verificar/Criar a publicação realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Adicionar tabelas ao Realtime (ignora se já existir)
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- 3. Configurar replica identity para updates funcionarem
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;

-- 4. Verificar que tudo está OK
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
