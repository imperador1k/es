-- ============================================
-- RLS Policy: UPDATE para team_files
-- Permite renomear se:
--   1. É o uploader do ficheiro
--   2. OU é admin/owner da equipa
-- ============================================

-- Verificar se existe política de UPDATE
DO $$
BEGIN
    -- Apagar política existente se houver
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_files' 
        AND policyname = 'Allow update for uploader or team admin'
    ) THEN
        DROP POLICY "Allow update for uploader or team admin" ON public.team_files;
    END IF;
END $$;

-- Criar política de UPDATE
CREATE POLICY "Allow update for uploader or team admin"
ON public.team_files
FOR UPDATE
USING (
    -- É o uploader do ficheiro
    uploader_id = auth.uid()
    OR
    -- OU é admin/owner da equipa
    EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_files.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    uploader_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_files.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
);
