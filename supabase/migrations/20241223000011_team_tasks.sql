-- ============================================
-- TEAM TASKS MODULE - Migration
-- Data: 2024-12-23
-- ============================================

-- A tabela `tasks` já existe com team_id e created_by.
-- Vamos criar a tabela de completions para tracking individual.

-- ============================================
-- 1. TABELA: team_task_completions
-- ============================================

CREATE TABLE IF NOT EXISTS public.team_task_completions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT team_task_completions_pkey PRIMARY KEY (id),
    
    -- Foreign Keys
    CONSTRAINT team_task_completions_task_id_fkey 
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
    CONSTRAINT team_task_completions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Unique: Um user só pode completar a mesma tarefa uma vez
    CONSTRAINT team_task_completions_unique UNIQUE (task_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_team_task_completions_task_id 
    ON public.team_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_team_task_completions_user_id 
    ON public.team_task_completions(user_id);

-- ============================================
-- 2. RLS POLICIES - tasks (para tarefas de equipa)
-- ============================================

-- Habilitar RLS (se ainda não estiver)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Apagar políticas existentes para recriar
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can create team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can update team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can delete team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;

-- SELECT: Membros da equipa podem ver tarefas da equipa + próprias tarefas pessoais
CREATE POLICY "Users can view team and own tasks"
ON public.tasks
FOR SELECT
USING (
    -- Tarefas pessoais (sem team_id)
    (team_id IS NULL AND user_id = auth.uid())
    OR
    -- Tarefas de equipa (com team_id) - apenas se for membro
    (team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
    ))
);

-- INSERT: Staff pode criar tarefas de equipa
CREATE POLICY "Staff can create team tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
    -- Tarefas pessoais
    (team_id IS NULL AND user_id = auth.uid())
    OR
    -- Tarefas de equipa - apenas staff (owner, admin, moderator, delegate)
    (team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin', 'moderator', 'delegate')
    ))
);

-- UPDATE: Staff pode editar tarefas de equipa
CREATE POLICY "Staff can update team tasks"
ON public.tasks
FOR UPDATE
USING (
    -- Tarefas pessoais
    (team_id IS NULL AND user_id = auth.uid())
    OR
    -- Tarefas de equipa - apenas staff
    (team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin', 'moderator', 'delegate')
    ))
)
WITH CHECK (
    (team_id IS NULL AND user_id = auth.uid())
    OR
    (team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin', 'moderator', 'delegate')
    ))
);

-- DELETE: Staff pode apagar tarefas de equipa
CREATE POLICY "Staff can delete team tasks"
ON public.tasks
FOR DELETE
USING (
    -- Tarefas pessoais
    (team_id IS NULL AND user_id = auth.uid())
    OR
    -- Tarefas de equipa - apenas staff
    (team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin', 'moderator', 'delegate')
    ))
);

-- ============================================
-- 3. RLS POLICIES - team_task_completions
-- ============================================

ALTER TABLE public.team_task_completions ENABLE ROW LEVEL SECURITY;

-- SELECT: Membros da equipa podem ver quem completou
CREATE POLICY "Team members can view completions"
ON public.team_task_completions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.team_members tm ON tm.team_id = t.team_id
        WHERE t.id = team_task_completions.task_id
        AND tm.user_id = auth.uid()
    )
);

-- INSERT: Utilizador pode marcar tarefa como completa (só para si)
CREATE POLICY "Users can mark tasks complete"
ON public.team_task_completions
FOR INSERT
WITH CHECK (
    -- Só pode inserir para si próprio
    user_id = auth.uid()
    AND
    -- E tem que ser membro da equipa da tarefa
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.team_members tm ON tm.team_id = t.team_id
        WHERE t.id = team_task_completions.task_id
        AND tm.user_id = auth.uid()
    )
);

-- DELETE: Utilizador pode desmarcar (só as suas)
CREATE POLICY "Users can unmark their completions"
ON public.team_task_completions
FOR DELETE
USING (
    user_id = auth.uid()
);

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.team_task_completions TO authenticated;
GRANT ALL ON public.team_task_completions TO service_role;
