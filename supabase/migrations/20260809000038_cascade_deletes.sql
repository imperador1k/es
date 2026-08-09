-- ============================================
-- CASCADE DELETES
-- Permite eliminar equipas, disciplinas, canais e salas
-- sem erros de foreign key constraint
-- ============================================

-- Helper: remove todos os FKs de child para parent e recria com ON DELETE CASCADE
-- (usado para tabelas cujos constraints podem ter nomes diferentes)

-- ============================================
-- 1. TEAMS -> filhos (eliminar equipa apaga tudo)
-- ============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.team_members'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
  LOOP EXECUTE format('ALTER TABLE public.team_members DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.channels'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
  LOOP EXECUTE format('ALTER TABLE public.channels DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.channels ADD CONSTRAINT channels_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
  LOOP EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.team_files'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
  LOOP EXECUTE format('ALTER TABLE public.team_files DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.team_files ADD CONSTRAINT team_files_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- team_events (pode não existir em todas as BD)
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_events') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.team_events'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
    LOOP EXECUTE format('ALTER TABLE public.team_events DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.team_events ADD CONSTRAINT team_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 2. CHANNELS -> mensagens (eliminar canal apaga tudo)
-- ============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND contype = 'f' AND confrelid = 'public.channels'::regclass
  LOOP EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.channel_reads'::regclass AND contype = 'f' AND confrelid = 'public.channels'::regclass
  LOOP EXECUTE format('ALTER TABLE public.channel_reads DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.channel_reads ADD CONSTRAINT channel_reads_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;

-- ============================================
-- 3. MESSAGES -> reações (message_id e channel_message_id)
-- ============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.message_reactions'::regclass AND contype = 'f' AND confrelid = 'public.messages'::regclass
  LOOP EXECUTE format('ALTER TABLE public.message_reactions DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.message_reactions ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
ALTER TABLE public.message_reactions ADD CONSTRAINT message_reactions_channel_message_id_fkey FOREIGN KEY (channel_message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

-- ============================================
-- 4. STUDY ROOMS -> filhos
-- ============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.study_room_messages'::regclass AND contype = 'f' AND confrelid = 'public.study_rooms'::regclass
  LOOP EXECUTE format('ALTER TABLE public.study_room_messages DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.study_room_messages ADD CONSTRAINT study_room_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.study_rooms(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.study_room_participants'::regclass AND contype = 'f' AND confrelid = 'public.study_rooms'::regclass
  LOOP EXECUTE format('ALTER TABLE public.study_room_participants DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.study_room_participants ADD CONSTRAINT study_room_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.study_rooms(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.study_room_reactions'::regclass AND contype = 'f' AND confrelid = 'public.study_rooms'::regclass
  LOOP EXECUTE format('ALTER TABLE public.study_room_reactions DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.study_room_reactions ADD CONSTRAINT study_room_reactions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.study_rooms(id) ON DELETE CASCADE;

-- ============================================
-- 5. USER_SUBJECTS (disciplinas) -> tarefas e sessões de estudo
-- ============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND contype = 'f' AND confrelid = 'public.user_subjects'::regclass
  LOOP EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.study_sessions'::regclass AND contype = 'f' AND confrelid = 'public.user_subjects'::regclass
  LOOP EXECUTE format('ALTER TABLE public.study_sessions DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;
