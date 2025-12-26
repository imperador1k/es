-- ============================================
-- TASKMASTER LMS MODULE
-- Sistema avançado de tarefas, grupos e entregas
-- ============================================

-- 1. ATUALIZAR TABELA TASKS
-- ============================================

-- Adicionar coluna de configuração JSONB
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{
    "requires_file_upload": false,
    "allowed_file_types": ["pdf", "jpg", "png", "docx"],
    "max_score": 20,
    "assignment_type": "individual",
    "allow_late_submissions": false
}'::jsonb;

-- Adicionar coluna para status da tarefa
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' 
CHECK (status IN ('draft', 'published', 'closed', 'archived'));

-- Adicionar coluna para permitir entregas em atraso
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS allow_late_submissions BOOLEAN DEFAULT false;

-- Adicionar coluna para data de publicação
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- 2. CRIAR TABELA TASK_GROUPS (Breakout Rooms)
-- ============================================
-- Grupos temporários criados para uma tarefa específica

CREATE TABLE IF NOT EXISTS public.task_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT task_groups_pkey PRIMARY KEY (id),
    CONSTRAINT task_groups_task_id_fkey FOREIGN KEY (task_id) 
        REFERENCES public.tasks(id) ON DELETE CASCADE
);

-- Índice para buscar grupos por tarefa
CREATE INDEX IF NOT EXISTS idx_task_groups_task_id ON public.task_groups(task_id);

-- 3. CRIAR TABELA TASK_GROUP_MEMBERS
-- ============================================
-- Membros de cada grupo

CREATE TABLE IF NOT EXISTS public.task_group_members (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT task_group_members_pkey PRIMARY KEY (id),
    CONSTRAINT task_group_members_group_id_fkey FOREIGN KEY (group_id) 
        REFERENCES public.task_groups(id) ON DELETE CASCADE,
    CONSTRAINT task_group_members_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Um utilizador só pode estar num grupo por tarefa
    CONSTRAINT task_group_members_unique UNIQUE (group_id, user_id)
);

-- Índice para buscar membros por grupo
CREATE INDEX IF NOT EXISTS idx_task_group_members_group_id ON public.task_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_task_group_members_user_id ON public.task_group_members(user_id);

-- 4. CRIAR TABELA TASK_ASSIGNMENTS
-- ============================================
-- Quem tem a tarefa atribuída (individual ou grupo)

CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID,        -- Se atribuição individual
    group_id UUID,       -- Se atribuição por grupo
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID,    -- Quem atribuiu (professor)
    
    CONSTRAINT task_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) 
        REFERENCES public.tasks(id) ON DELETE CASCADE,
    CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT task_assignments_group_id_fkey FOREIGN KEY (group_id) 
        REFERENCES public.task_groups(id) ON DELETE CASCADE,
    CONSTRAINT task_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) 
        REFERENCES public.profiles(id),
    -- Deve ter user_id OU group_id, não ambos
    CONSTRAINT task_assignments_user_or_group CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR 
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_group_id ON public.task_assignments(group_id);

-- 5. CRIAR TABELA TASK_SUBMISSIONS
-- ============================================
-- Entregas dos alunos

CREATE TABLE IF NOT EXISTS public.task_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,           -- Quem submeteu
    group_id UUID,                   -- Se submissão de grupo
    
    -- Conteúdo da submissão
    content TEXT,                    -- Texto/comentário
    file_url TEXT,                   -- URL do ficheiro no Storage
    file_name TEXT,                  -- Nome original do ficheiro
    file_type TEXT,                  -- MIME type
    file_size INTEGER,               -- Tamanho em bytes
    link_url TEXT,                   -- Link externo (alternativa a ficheiro)
    
    -- Estado e avaliação
    status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    score INTEGER,                   -- Nota atribuída pelo professor
    feedback TEXT,                   -- Comentário do professor
    graded_by UUID,                  -- Quem avaliou
    graded_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_late BOOLEAN DEFAULT false,   -- Se foi entregue após prazo
    
    CONSTRAINT task_submissions_pkey PRIMARY KEY (id),
    CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) 
        REFERENCES public.tasks(id) ON DELETE CASCADE,
    CONSTRAINT task_submissions_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT task_submissions_group_id_fkey FOREIGN KEY (group_id) 
        REFERENCES public.task_groups(id) ON DELETE SET NULL,
    CONSTRAINT task_submissions_graded_by_fkey FOREIGN KEY (graded_by) 
        REFERENCES public.profiles(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_group_id ON public.task_submissions(group_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON public.task_submissions(status);

-- 6. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- Task Groups: Membros da equipa podem ver
CREATE POLICY "Team members can view task groups" ON public.task_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = task_groups.task_id AND tm.user_id = auth.uid()
        )
    );

-- Task Groups: Admins podem criar
CREATE POLICY "Team admins can create task groups" ON public.task_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = task_groups.task_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- Task Group Members: Membros podem ver
CREATE POLICY "Users can view group members" ON public.task_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.task_groups tg
            JOIN public.tasks t ON t.id = tg.task_id
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE tg.id = task_group_members.group_id AND tm.user_id = auth.uid()
        )
    );

-- Task Assignments: Utilizadores podem ver as suas
CREATE POLICY "Users can view their assignments" ON public.task_assignments
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.task_group_members tgm
            WHERE tgm.group_id = task_assignments.group_id AND tgm.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = task_assignments.task_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- Task Submissions: Utilizadores podem ver as suas
CREATE POLICY "Users can view own submissions" ON public.task_submissions
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON tm.team_id = t.team_id
            WHERE t.id = task_submissions.task_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'moderator')
        )
    );

-- Task Submissions: Utilizadores podem criar
CREATE POLICY "Users can create submissions" ON public.task_submissions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.task_assignments ta
            WHERE ta.task_id = task_submissions.task_id 
            AND (ta.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.task_group_members tgm
                WHERE tgm.group_id = ta.group_id AND tgm.user_id = auth.uid()
            ))
        )
    );

-- Task Submissions: Utilizadores podem atualizar as suas (antes de avaliadas)
CREATE POLICY "Users can update own submissions" ON public.task_submissions
    FOR UPDATE USING (
        user_id = auth.uid() AND status IN ('draft', 'submitted')
    );

-- 7. FUNÇÕES AUXILIARES
-- ============================================

-- Função para gerar grupos aleatórios
CREATE OR REPLACE FUNCTION generate_random_groups(
    p_task_id UUID,
    p_team_id UUID,
    p_members_per_group INTEGER
)
RETURNS TABLE(group_id UUID, group_name TEXT, members UUID[])
LANGUAGE plpgsql
AS $$
DECLARE
    v_members UUID[];
    v_member UUID;
    v_group_id UUID;
    v_group_num INTEGER := 1;
    v_current_group UUID[];
BEGIN
    -- Buscar todos os membros da equipa
    SELECT ARRAY_AGG(user_id ORDER BY random()) INTO v_members
    FROM public.team_members
    WHERE team_id = p_team_id AND role != 'owner';
    
    -- Criar grupos
    v_current_group := ARRAY[]::UUID[];
    
    FOREACH v_member IN ARRAY v_members
    LOOP
        v_current_group := array_append(v_current_group, v_member);
        
        IF array_length(v_current_group, 1) >= p_members_per_group THEN
            -- Criar grupo
            INSERT INTO public.task_groups (task_id, name, color)
            VALUES (p_task_id, 'Grupo ' || v_group_num, 
                   CASE v_group_num % 6
                       WHEN 0 THEN '#EF4444'
                       WHEN 1 THEN '#F59E0B'
                       WHEN 2 THEN '#10B981'
                       WHEN 3 THEN '#3B82F6'
                       WHEN 4 THEN '#8B5CF6'
                       ELSE '#EC4899'
                   END)
            RETURNING id INTO v_group_id;
            
            -- Adicionar membros ao grupo
            INSERT INTO public.task_group_members (group_id, user_id)
            SELECT v_group_id, unnest(v_current_group);
            
            -- Criar assignment para o grupo
            INSERT INTO public.task_assignments (task_id, group_id, assigned_by)
            VALUES (p_task_id, v_group_id, auth.uid());
            
            -- Retornar grupo
            group_id := v_group_id;
            group_name := 'Grupo ' || v_group_num;
            members := v_current_group;
            RETURN NEXT;
            
            v_group_num := v_group_num + 1;
            v_current_group := ARRAY[]::UUID[];
        END IF;
    END LOOP;
    
    -- Criar último grupo com membros restantes
    IF array_length(v_current_group, 1) > 0 THEN
        INSERT INTO public.task_groups (task_id, name, color)
        VALUES (p_task_id, 'Grupo ' || v_group_num,
               CASE v_group_num % 6
                   WHEN 0 THEN '#EF4444'
                   WHEN 1 THEN '#F59E0B'
                   WHEN 2 THEN '#10B981'
                   WHEN 3 THEN '#3B82F6'
                   WHEN 4 THEN '#8B5CF6'
                   ELSE '#EC4899'
               END)
        RETURNING id INTO v_group_id;
        
        INSERT INTO public.task_group_members (group_id, user_id)
        SELECT v_group_id, unnest(v_current_group);
        
        INSERT INTO public.task_assignments (task_id, group_id, assigned_by)
        VALUES (p_task_id, v_group_id, auth.uid());
        
        group_id := v_group_id;
        group_name := 'Grupo ' || v_group_num;
        members := v_current_group;
        RETURN NEXT;
    END IF;
END;
$$;

-- Função para atribuir tarefa a toda a equipa
CREATE OR REPLACE FUNCTION assign_task_to_team(
    p_task_id UUID,
    p_team_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    INSERT INTO public.task_assignments (task_id, user_id, assigned_by)
    SELECT p_task_id, tm.user_id, auth.uid()
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
    AND NOT EXISTS (
        SELECT 1 FROM public.task_assignments ta
        WHERE ta.task_id = p_task_id AND ta.user_id = tm.user_id
    );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- 8. ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;

-- 9. STORAGE BUCKET (executar no Dashboard do Supabase)
-- ============================================
-- Nome: task-submissions
-- Public: false
-- Policies: 
--   - Authenticated users can upload to their folder
--   - Team admins can view all
