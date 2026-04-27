-- ============================================
-- TASK_SUBMISSIONS - RLS Policies
-- Para permitir que utilizadores submetam tarefas
-- ============================================

-- Enable RLS
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own submissions
DROP POLICY IF EXISTS "Users can view own submissions" ON public.task_submissions;
CREATE POLICY "Users can view own submissions" ON public.task_submissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own submissions
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.task_submissions;
CREATE POLICY "Users can insert own submissions" ON public.task_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own submissions (before grading)
DROP POLICY IF EXISTS "Users can update own submissions" ON public.task_submissions;
CREATE POLICY "Users can update own submissions" ON public.task_submissions
    FOR UPDATE
    USING (auth.uid() = user_id AND status IN ('draft', 'submitted'))
    WITH CHECK (auth.uid() = user_id);

-- Policy: Team members can submit to team tasks
DROP POLICY IF EXISTS "Team members can submit" ON public.task_submissions;
CREATE POLICY "Team members can submit" ON public.task_submissions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = task_submissions.task_id
            AND tm.user_id = auth.uid()
        )
    );

-- Policy: Team admins can view all submissions for their team's tasks
DROP POLICY IF EXISTS "Team admins can view team submissions" ON public.task_submissions;
CREATE POLICY "Team admins can view team submissions" ON public.task_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = task_submissions.task_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- Policy: Team admins can update (grade) submissions
DROP POLICY IF EXISTS "Team admins can grade submissions" ON public.task_submissions;
CREATE POLICY "Team admins can grade submissions" ON public.task_submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = task_submissions.task_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- Unique constraint for upsert (one submission per user per task)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_submissions_task_user_unique'
  ) THEN
    ALTER TABLE public.task_submissions 
    ADD CONSTRAINT task_submissions_task_user_unique 
    UNIQUE (task_id, user_id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON public.task_submissions(status);
