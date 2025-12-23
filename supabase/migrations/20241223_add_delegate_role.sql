-- ============================================
-- ADICIONAR 'delegate' AO ENUM DE ROLES
-- ============================================

-- Opção 1: Se estiveres a usar um CHECK constraint
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_role_check 
CHECK (role IN ('owner', 'admin', 'moderator', 'delegate', 'member'));

-- Opção 2: Se estiveres a usar um ENUM type
-- Descomentar se aplicável:
-- ALTER TYPE team_role ADD VALUE 'delegate' AFTER 'moderator';

-- ============================================
-- NOTA:
-- Execute este SQL no Supabase SQL Editor
-- ============================================
