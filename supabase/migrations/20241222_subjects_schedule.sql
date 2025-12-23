-- ============================================================
-- SISTEMA DE DISCIPLINAS E HORÁRIOS
-- Escola+ App
-- ============================================================

-- ===========================================
-- 1. DISCIPLINAS DO UTILIZADOR
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text DEFAULT '#6366f1', -- Hex code para o calendário
    teacher_name text,
    room text, -- Sala default
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índice para pesquisa rápida por utilizador
CREATE INDEX IF NOT EXISTS idx_user_subjects_user_id ON public.user_subjects(user_id);

-- ===========================================
-- 2. HORÁRIO DE AULAS
-- ===========================================
CREATE TABLE IF NOT EXISTS public.class_schedule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public.user_subjects(id) ON DELETE CASCADE,
    day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Dom, 1=Seg, ..., 6=Sáb
    start_time time NOT NULL, -- formato 'HH:MM:SS'
    end_time time NOT NULL,
    room text, -- Sala específica desta aula (overrides subject.room)
    type text DEFAULT 'T' CHECK (type IN ('T', 'P', 'TP', 'S', 'PL')), -- Teórica, Prática, Teórico-Prática, Seminário, PráticaLab
    notes text, -- Notas adicionais
    created_at timestamptz DEFAULT now(),
    
    -- Validar que end_time > start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Índices para pesquisa rápida
CREATE INDEX IF NOT EXISTS idx_class_schedule_user_id ON public.class_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_class_schedule_subject_id ON public.class_schedule(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_schedule_day ON public.class_schedule(day_of_week);

-- ===========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Ativar RLS
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;

-- Políticas para user_subjects
CREATE POLICY "Users can view own subjects" ON public.user_subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON public.user_subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON public.user_subjects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON public.user_subjects
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para class_schedule
CREATE POLICY "Users can view own schedule" ON public.class_schedule
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" ON public.class_schedule
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" ON public.class_schedule
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule" ON public.class_schedule
    FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- 4. TRIGGER PARA UPDATED_AT
-- ===========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para user_subjects
DROP TRIGGER IF EXISTS update_user_subjects_updated_at ON public.user_subjects;
CREATE TRIGGER update_user_subjects_updated_at
    BEFORE UPDATE ON public.user_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 5. REALTIME (opcional)
-- ===========================================

-- Habilitar realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_schedule;
