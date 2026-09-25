-- ============================================================
-- COMPREHENSIVE CASCADE DELETES & SECURE RPCs
-- Allows deleting tasks, teams, subjects, and channels cleanly
-- without PostgreSQL foreign key constraint errors
-- ============================================================

-- ============================================================
-- 1. TASKS -> Children (Deleting a task cascades to assignments, groups, submissions)
-- ============================================================

-- task_groups -> tasks
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_groups') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.task_groups'::regclass AND contype = 'f' AND confrelid = 'public.tasks'::regclass
    LOOP EXECUTE format('ALTER TABLE public.task_groups DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.task_groups ADD CONSTRAINT task_groups_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- task_assignments -> tasks
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_assignments') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.task_assignments'::regclass AND contype = 'f' AND confrelid = 'public.tasks'::regclass
    LOOP EXECUTE format('ALTER TABLE public.task_assignments DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.task_assignments ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- task_submissions -> tasks
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_submissions') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.task_submissions'::regclass AND contype = 'f' AND confrelid = 'public.tasks'::regclass
    LOOP EXECUTE format('ALTER TABLE public.task_submissions DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- team_task_completions -> tasks
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_task_completions') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.team_task_completions'::regclass AND contype = 'f' AND confrelid = 'public.tasks'::regclass
    LOOP EXECUTE format('ALTER TABLE public.team_task_completions DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.team_task_completions ADD CONSTRAINT team_task_completions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. TASK GROUPS -> Children
-- ============================================================

-- task_group_members -> task_groups
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_group_members') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.task_group_members'::regclass AND contype = 'f' AND confrelid = 'public.task_groups'::regclass
    LOOP EXECUTE format('ALTER TABLE public.task_group_members DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.task_group_members ADD CONSTRAINT task_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.task_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

-- task_assignments -> task_groups (group_id)
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_assignments') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.task_assignments'::regclass AND contype = 'f' AND confrelid = 'public.task_groups'::regclass
    LOOP EXECUTE format('ALTER TABLE public.task_assignments DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.task_assignments ADD CONSTRAINT task_assignments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.task_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

-- task_submissions -> task_groups (group_id) - SET NULL so submission history is preserved
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_submissions') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.task_submissions'::regclass AND contype = 'f' AND confrelid = 'public.task_groups'::regclass
    LOOP EXECUTE format('ALTER TABLE public.task_submissions DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.task_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3. TEAMS -> Children
-- ============================================================

-- study_rooms -> teams
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_rooms') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.study_rooms'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
    LOOP EXECUTE format('ALTER TABLE public.study_rooms DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.study_rooms ADD CONSTRAINT study_rooms_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- team_members -> teams
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.team_members'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
    LOOP EXECUTE format('ALTER TABLE public.team_members DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- channels -> teams
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'channels') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.channels'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
    LOOP EXECUTE format('ALTER TABLE public.channels DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.channels ADD CONSTRAINT channels_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- tasks -> teams
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
    LOOP EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- team_files -> teams
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_files') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.team_files'::regclass AND contype = 'f' AND confrelid = 'public.teams'::regclass
    LOOP EXECUTE format('ALTER TABLE public.team_files DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.team_files ADD CONSTRAINT team_files_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- team_files -> parent_id (Nested folders/files)
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_files') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.team_files'::regclass AND contype = 'f' AND confrelid = 'public.team_files'::regclass
    LOOP EXECUTE format('ALTER TABLE public.team_files DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.team_files ADD CONSTRAINT team_files_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.team_files(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 4. USER_SUBJECTS -> Children
-- ============================================================

-- class_schedule -> user_subjects
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'class_schedule') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.class_schedule'::regclass AND contype = 'f' AND confrelid = 'public.user_subjects'::regclass
    LOOP EXECUTE format('ALTER TABLE public.class_schedule DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.class_schedule ADD CONSTRAINT class_schedule_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- personal_todos -> user_subjects
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'personal_todos') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.personal_todos'::regclass AND contype = 'f' AND confrelid = 'public.user_subjects'::regclass
    LOOP EXECUTE format('ALTER TABLE public.personal_todos DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.personal_todos ADD CONSTRAINT personal_todos_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- tasks -> user_subjects
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND contype = 'f' AND confrelid = 'public.user_subjects'::regclass
    LOOP EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- study_sessions -> user_subjects
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_sessions') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.study_sessions'::regclass AND contype = 'f' AND confrelid = 'public.user_subjects'::regclass
    LOOP EXECUTE format('ALTER TABLE public.study_sessions DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 5. PERSONAL_TODOS -> Children
-- ============================================================

-- personal_todo_steps -> personal_todos
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'personal_todo_steps') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.personal_todo_steps'::regclass AND contype = 'f' AND confrelid = 'public.personal_todos'::regclass
    LOOP EXECUTE format('ALTER TABLE public.personal_todo_steps DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.personal_todo_steps ADD CONSTRAINT personal_todo_steps_todo_id_fkey FOREIGN KEY (todo_id) REFERENCES public.personal_todos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 6. MESSAGES & DM_MESSAGES -> Replies
-- ============================================================

-- messages -> reply_to_id
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND contype = 'f' AND confrelid = 'public.messages'::regclass
    LOOP EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.messages ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- dm_messages -> reply_to_id
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dm_messages') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.dm_messages'::regclass AND contype = 'f' AND confrelid = 'public.dm_messages'::regclass
    LOOP EXECUTE format('ALTER TABLE public.dm_messages DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.dm_messages ADD CONSTRAINT dm_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.dm_messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 7. RLS POLICIES IMPROVEMENT
-- ============================================================

-- Allow creator, team owner, OR team admin to delete tasks
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR created_by = auth.uid()
        OR (team_id IS NOT NULL AND (is_team_owner(team_id) OR is_team_admin(team_id)))
    );

-- User goals RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_goals_all" ON public.user_goals;
CREATE POLICY "user_goals_all" ON public.user_goals
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 8. SECURE RPC FUNCTIONS FOR ATOMIC DELETIONS
-- ============================================================

-- delete_team: Atomically deletes team if caller is owner
CREATE OR REPLACE FUNCTION public.delete_team(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = p_team_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Apenas o proprietário pode eliminar a equipa';
    END IF;

    -- Deleting the team cascades automatically to all children in a single transaction
    DELETE FROM public.teams WHERE id = p_team_id;
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_team(uuid) TO authenticated;

-- delete_task: Atomically deletes task if caller is owner/admin
CREATE OR REPLACE FUNCTION public.delete_task(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task record;
BEGIN
    SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF v_task.team_id IS NULL THEN
        IF v_task.user_id != auth.uid() AND v_task.created_by != auth.uid() THEN
            RAISE EXCEPTION 'Sem permissão para eliminar esta tarefa pessoal';
        END IF;
    ELSE
        IF v_task.created_by != auth.uid() 
           AND NOT is_team_admin(v_task.team_id) 
           AND NOT is_team_owner(v_task.team_id) THEN
            RAISE EXCEPTION 'Sem permissão para eliminar esta tarefa de equipa';
        END IF;
    END IF;

    DELETE FROM public.tasks WHERE id = p_task_id;
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_task(uuid) TO authenticated;

-- ============================================================
-- 9. EXPAND CHECK CONSTRAINTS (Prevent invalid type errors on CRUD)
-- ============================================================

-- Expand tasks.type to allow 'project' and 'other' in addition to 'study', 'exam', 'assignment'
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%type%'
    LOOP EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check CHECK (type = ANY (ARRAY['study'::text, 'exam'::text, 'assignment'::text, 'project'::text, 'other'::text]));
  END IF;
END $$;

-- Expand channels.type to allow 'text' in addition to 'chat', 'announcements', 'resources'
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'channels') THEN
    FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.channels'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%type%'
    LOOP EXECUTE format('ALTER TABLE public.channels DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE public.channels ADD CONSTRAINT channels_type_check CHECK (type = ANY (ARRAY['chat'::text, 'announcements'::text, 'resources'::text, 'text'::text]));
  END IF;
END $$;
