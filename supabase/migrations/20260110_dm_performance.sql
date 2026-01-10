-- RPCs for DM Performance
-- Authors: Antigravity
-- Date: 2026-01-10

-- 1. Get last message for a list of conversations
CREATE OR REPLACE FUNCTION get_last_messages(p_conversation_ids uuid[])
RETURNS SETOF dm_messages
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (conversation_id) *
  FROM dm_messages
  WHERE conversation_id = ANY(p_conversation_ids)
  ORDER BY conversation_id, created_at DESC;
$$;

-- 2. Get unread counts for a list of conversations
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id uuid, p_conversation_ids uuid[])
RETURNS TABLE (conversation_id uuid, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT conversation_id, count(*)
  FROM dm_messages
  WHERE conversation_id = ANY(p_conversation_ids)
  AND is_read = false
  AND sender_id != p_user_id
  GROUP BY conversation_id;
$$;
