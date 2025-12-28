-- ============================================
-- PLANNER CENTRAL - Personal Todos
-- Separates personal to-dos from team tasks
-- ============================================

-- ============================================
-- 1. PERSONAL TODOS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.personal_todos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    tags text[] DEFAULT '{}',
    subject_id uuid REFERENCES public.user_subjects(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_personal_todos_user_id ON public.personal_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_todos_due_date ON public.personal_todos(due_date);
CREATE INDEX IF NOT EXISTS idx_personal_todos_is_completed ON public.personal_todos(is_completed);

-- ============================================
-- 2. PERSONAL TODO STEPS (Subtasks)
-- ============================================

CREATE TABLE IF NOT EXISTS public.personal_todo_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id uuid NOT NULL REFERENCES public.personal_todos(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_completed boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_todo_steps_todo_id ON public.personal_todo_steps(todo_id);

-- ============================================
-- 3. RLS POLICIES
-- ============================================

ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_todo_steps ENABLE ROW LEVEL SECURITY;

-- Personal Todos: Users can only access their own
DROP POLICY IF EXISTS "Users can view own todos" ON public.personal_todos;
CREATE POLICY "Users can view own todos" ON public.personal_todos
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own todos" ON public.personal_todos;
CREATE POLICY "Users can create own todos" ON public.personal_todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own todos" ON public.personal_todos;
CREATE POLICY "Users can update own todos" ON public.personal_todos
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own todos" ON public.personal_todos;
CREATE POLICY "Users can delete own todos" ON public.personal_todos
    FOR DELETE USING (auth.uid() = user_id);

-- Todo Steps: Users can access steps of their todos
DROP POLICY IF EXISTS "Users can view own todo steps" ON public.personal_todo_steps;
CREATE POLICY "Users can view own todo steps" ON public.personal_todo_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.personal_todos 
            WHERE id = todo_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage own todo steps" ON public.personal_todo_steps;
CREATE POLICY "Users can manage own todo steps" ON public.personal_todo_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.personal_todos 
            WHERE id = todo_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Toggle todo completion
CREATE OR REPLACE FUNCTION public.toggle_todo_completion(p_todo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status boolean;
    v_new_status boolean;
BEGIN
    -- Get current status
    SELECT is_completed INTO v_current_status
    FROM personal_todos
    WHERE id = p_todo_id AND user_id = auth.uid();

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Todo not found or not yours';
    END IF;

    v_new_status := NOT v_current_status;

    -- Update todo
    UPDATE personal_todos
    SET 
        is_completed = v_new_status,
        completed_at = CASE WHEN v_new_status THEN now() ELSE NULL END,
        updated_at = now()
    WHERE id = p_todo_id;

    RETURN v_new_status;
END;
$$;

-- Toggle step completion
CREATE OR REPLACE FUNCTION public.toggle_todo_step(p_step_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status boolean;
BEGIN
    -- Get and toggle
    UPDATE personal_todo_steps
    SET is_completed = NOT is_completed
    WHERE id = p_step_id
    AND EXISTS (
        SELECT 1 FROM personal_todos t
        WHERE t.id = personal_todo_steps.todo_id AND t.user_id = auth.uid()
    )
    RETURNING is_completed INTO v_current_status;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Step not found';
    END IF;

    RETURN v_current_status;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.toggle_todo_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_todo_step(uuid) TO authenticated;

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_personal_todo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_personal_todo_timestamp ON personal_todos;
CREATE TRIGGER trigger_update_personal_todo_timestamp
    BEFORE UPDATE ON personal_todos
    FOR EACH ROW
    EXECUTE FUNCTION update_personal_todo_timestamp();
