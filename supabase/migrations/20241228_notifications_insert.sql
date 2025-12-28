-- ============================================
-- NOTIFICATIONS - ADD NEW TYPES TO ENUM
-- ============================================

-- First, check if notification_type enum exists and add new values
-- Note: PostgreSQL doesn't allow easy ENUM modification, so we need to:
-- 1. Add new values if they don't exist
-- 2. Or recreate the column as TEXT

-- Option 1: Try to add values to existing enum (may fail if already exists)
DO $$
BEGIN
    -- Add direct_message if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'direct_message' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'direct_message';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if enum doesn't exist or value already exists
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'new_task' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_task';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'team_invite' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'team_invite';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_submitted' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_submitted';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Option 2 (SAFER): Convert type column from ENUM to TEXT
-- This is more flexible and allows any notification type
-- Uncomment below if Option 1 doesn't work:

ALTER TABLE public.notifications 
ALTER COLUMN type TYPE text USING type::text;

-- Add check constraint for valid types (optional, for validation)
-- ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
-- ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
--     CHECK (type IN ('task_assigned', 'mention', 'reply', 'reaction', 'system', 
--                     'direct_message', 'new_task', 'team_invite', 'task_submitted'));

-- ============================================
-- RLS INSERT POLICY (if not exists)
-- ============================================

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
