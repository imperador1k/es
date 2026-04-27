-- ============================================
-- FIX: dm_messages UPDATE policy
-- Allow participants to mark messages as read
-- ============================================

-- Use the original parameter name (conv_uuid) to allow CREATE OR REPLACE without dropping
CREATE OR REPLACE FUNCTION public.is_dm_participant(conv_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.dm_conversations
        WHERE id = conv_uuid
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    );
$$;

-- Drop and recreate the UPDATE policy to be more permissive
DROP POLICY IF EXISTS "dm_messages_update" ON public.dm_messages;
CREATE POLICY "dm_messages_update" ON public.dm_messages
    FOR UPDATE
    USING (is_dm_participant(conversation_id))
    WITH CHECK (
        is_dm_participant(conversation_id)
        AND (
            -- Either the sender is updating (e.g., status)
            sender_id = auth.uid()
            OR 
            -- Or the receiver is updating 'is_read'
            EXISTS (
                SELECT 1 FROM public.dm_conversations
                WHERE id = conversation_id
                AND (
                    (user1_id = auth.uid() AND sender_id = user2_id) OR
                    (user2_id = auth.uid() AND sender_id = user1_id)
                )
            )
        )
    );
