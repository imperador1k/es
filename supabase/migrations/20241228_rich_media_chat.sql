-- ============================================
-- RICH MEDIA CHAT UPGRADE
-- Adds attachment support to all chat messages
-- ============================================

-- 1. Add attachment columns to dm_messages
ALTER TABLE public.dm_messages
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'video', 'file', 'gif')),
ADD COLUMN IF NOT EXISTS attachment_name text;

-- 2. Add attachment columns to messages (team channels)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'video', 'file', 'gif')),
ADD COLUMN IF NOT EXISTS attachment_name text;

-- 3. Add attachment columns to study_room_messages
ALTER TABLE public.study_room_messages
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'video', 'file', 'gif')),
ADD COLUMN IF NOT EXISTS attachment_name text;

-- 4. Create indexes for faster queries on attachment_type
CREATE INDEX IF NOT EXISTS idx_dm_messages_attachment ON public.dm_messages(attachment_type) WHERE attachment_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_attachment ON public.messages(attachment_type) WHERE attachment_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_study_room_messages_attachment ON public.study_room_messages(attachment_type) WHERE attachment_type IS NOT NULL;

-- Note: Storage bucket 'chat-files' already exists with public access
-- If you need to create it, uncomment below:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

COMMENT ON COLUMN public.dm_messages.attachment_type IS 'Type of attachment: image, video, file, or gif';
COMMENT ON COLUMN public.messages.attachment_type IS 'Type of attachment: image, video, file, or gif';
COMMENT ON COLUMN public.study_room_messages.attachment_type IS 'Type of attachment: image, video, file, or gif';

-- ============================================
-- RPC: SEND STUDY ROOM MESSAGE (with attachments)
-- ============================================

CREATE OR REPLACE FUNCTION public.send_room_message(
    p_room_id uuid,
    p_content text,
    p_attachment_url text DEFAULT NULL,
    p_attachment_type text DEFAULT NULL,
    p_attachment_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_message_id uuid;
BEGIN
    -- Check if user is participant
    IF NOT EXISTS (
        SELECT 1 FROM study_room_participants
        WHERE room_id = p_room_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this room';
    END IF;

    -- Insert message
    INSERT INTO study_room_messages (room_id, user_id, content, attachment_url, attachment_type, attachment_name)
    VALUES (p_room_id, v_user_id, p_content, p_attachment_url, p_attachment_type, p_attachment_name)
    RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

-- ============================================
-- RPC: SEND DM MESSAGE (with attachments)
-- ============================================

CREATE OR REPLACE FUNCTION public.send_dm_message(
    p_conversation_id uuid,
    p_content text,
    p_attachment_url text DEFAULT NULL,
    p_attachment_type text DEFAULT NULL,
    p_attachment_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_message_id uuid;
BEGIN
    -- Check if user is part of conversation
    IF NOT EXISTS (
        SELECT 1 FROM dm_conversations
        WHERE id = p_conversation_id 
        AND (user1_id = v_user_id OR user2_id = v_user_id)
    ) THEN
        RAISE EXCEPTION 'User is not part of this conversation';
    END IF;

    -- Insert message
    INSERT INTO dm_messages (conversation_id, sender_id, content, attachment_url, attachment_type, attachment_name, status)
    VALUES (p_conversation_id, v_user_id, p_content, p_attachment_url, p_attachment_type, p_attachment_name, 'sent')
    RETURNING id INTO v_message_id;

    -- Update conversation last_message_at
    UPDATE dm_conversations
    SET last_message_at = NOW()
    WHERE id = p_conversation_id;

    RETURN v_message_id;
END;
$$;

-- ============================================
-- RPC: SEND TEAM CHANNEL MESSAGE (with attachments)
-- ============================================

CREATE OR REPLACE FUNCTION public.send_team_message(
    p_channel_id uuid,
    p_content text,
    p_attachment_url text DEFAULT NULL,
    p_attachment_type text DEFAULT NULL,
    p_attachment_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_team_id uuid;
    v_message_id uuid;
BEGIN
    -- Get team_id from channel
    SELECT team_id INTO v_team_id FROM channels WHERE id = p_channel_id;
    
    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Channel not found';
    END IF;

    -- Check if user is member of team
    IF NOT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = v_team_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this team';
    END IF;

    -- Insert message
    INSERT INTO messages (channel_id, user_id, content, attachment_url, attachment_type, attachment_name)
    VALUES (p_channel_id, v_user_id, p_content, p_attachment_url, p_attachment_type, p_attachment_name)
    RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.send_room_message(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_dm_message(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_team_message(uuid, text, text, text, text) TO authenticated;
