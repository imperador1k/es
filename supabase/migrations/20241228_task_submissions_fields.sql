-- ============================================
-- TEAM TASK COMPLETIONS - Add Submission Fields
-- Adds columns for file uploads, comments, and status
-- ============================================

-- Add status column (pending, submitted, completed, graded)
ALTER TABLE public.team_task_completions
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' 
CHECK (status IN ('pending', 'submitted', 'completed', 'graded'));

-- Add comment column
ALTER TABLE public.team_task_completions
ADD COLUMN IF NOT EXISTS comment text;

-- Add file upload columns
ALTER TABLE public.team_task_completions
ADD COLUMN IF NOT EXISTS file_url text;

ALTER TABLE public.team_task_completions
ADD COLUMN IF NOT EXISTS file_name text;

ALTER TABLE public.team_task_completions
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Add unique constraint for user+task (for upsert to work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'team_task_completions_task_user_unique'
  ) THEN
    ALTER TABLE public.team_task_completions 
    ADD CONSTRAINT team_task_completions_task_user_unique 
    UNIQUE (task_id, user_id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_task_completions_task_id 
ON public.team_task_completions(task_id);

CREATE INDEX IF NOT EXISTS idx_team_task_completions_user_id 
ON public.team_task_completions(user_id);

-- ============================================
-- CREATE STORAGE BUCKET FOR TASK SUBMISSIONS
-- ============================================
-- Note: Run this in the Supabase Dashboard > Storage > New bucket
-- Bucket name: task-submissions
-- Public: false (or true if you want public URLs)

-- ============================================
-- UPDATE existing completions to have status
-- ============================================
UPDATE public.team_task_completions
SET status = 'completed'
WHERE status IS NULL AND completed_at IS NOT NULL;

UPDATE public.team_task_completions
SET status = 'pending'
WHERE status IS NULL;

-- ============================================
-- RLS POLICIES FOR TEAM TASK COMPLETIONS
-- ============================================

-- Enable RLS
ALTER TABLE public.team_task_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own completions
DROP POLICY IF EXISTS "Users can view own completions" ON public.team_task_completions;
CREATE POLICY "Users can view own completions" ON public.team_task_completions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own completions
DROP POLICY IF EXISTS "Users can insert own completions" ON public.team_task_completions;
CREATE POLICY "Users can insert own completions" ON public.team_task_completions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own completions
DROP POLICY IF EXISTS "Users can update own completions" ON public.team_task_completions;
CREATE POLICY "Users can update own completions" ON public.team_task_completions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Team admins can view all completions for their team's tasks
DROP POLICY IF EXISTS "Team admins can view team completions" ON public.team_task_completions;
CREATE POLICY "Team admins can view team completions" ON public.team_task_completions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = team_task_completions.task_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'moderator')
        )
    );
