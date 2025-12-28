-- ============================================
-- FIX: dm_messages UPDATE policy
-- Allow participants to mark messages as read
-- ============================================

-- First, check if is_dm_participant function exists
CREATE OR REPLACE FUNCTION public.is_dm_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.dm_conversations
        WHERE id = p_conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    );
$$;

-- Drop and recreate the UPDATE policy to be more permissive
DROP POLICY IF EXISTS "dm_messages_update" ON public.dm_messages;
CREATE POLICY "dm_messages_update" ON public.dm_messages
    FOR UPDATE
    TO authenticated
    USING (
        -- Allow update if you are a participant in the conversation
        EXISTS (
            SELECT 1 FROM public.dm_conversations c
            WHERE c.id = dm_messages.conversation_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    )
    WITH CHECK (
        -- Same check for the new values
        EXISTS (
            SELECT 1 FROM public.dm_conversations c
            WHERE c.id = dm_messages.conversation_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );
