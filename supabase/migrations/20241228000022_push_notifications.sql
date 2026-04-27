-- ============================================
-- PUSH NOTIFICATIONS SETUP
-- Database Webhooks for message notifications
-- ============================================

-- Note: Database Webhooks must be configured in the Supabase Dashboard.
-- Go to: Database > Webhooks > Create a new webhook
-- 
-- Create 3 webhooks:
--
-- 1. DM Messages Webhook
--    - Name: push_dm_messages
--    - Table: dm_messages
--    - Events: INSERT
--    - Type: Supabase Edge Function
--    - Function: push-sender
--    - HTTP Headers: 
--      - Content-Type: application/json
--
-- 2. Team Messages Webhook  
--    - Name: push_team_messages
--    - Table: messages
--    - Events: INSERT
--    - Type: Supabase Edge Function
--    - Function: push-sender
--
-- 3. Study Room Messages Webhook
--    - Name: push_study_room_messages
--    - Table: study_room_messages
--    - Events: INSERT
--    - Type: Supabase Edge Function
--    - Function: push-sender

-- ============================================
-- ALTERNATIVE: Use pg_net for HTTP calls (if Edge Functions not available)
-- ============================================

-- Enable pg_net extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Example trigger function using pg_net (alternative approach):
/*
CREATE OR REPLACE FUNCTION notify_push_on_message()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  payload JSONB;
BEGIN
  edge_function_url := current_setting('app.supabase_url') || '/functions/v1/push-sender';
  
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', NULL
  );

  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_push_dm_messages
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_message();

CREATE TRIGGER trigger_push_team_messages
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_message();

CREATE TRIGGER trigger_push_study_room_messages
  AFTER INSERT ON study_room_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_message();
*/

-- ============================================
-- ENSURE user_push_tokens TABLE HAS PROPER CONSTRAINTS
-- ============================================

-- Add unique constraint for upsert to work properly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_push_tokens_user_id_token_key'
  ) THEN
    ALTER TABLE user_push_tokens 
    ADD CONSTRAINT user_push_tokens_user_id_token_key 
    UNIQUE (user_id, token);
  END IF;
END $$;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id 
ON user_push_tokens(user_id);

-- RLS Policies for user_push_tokens
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
DROP POLICY IF EXISTS "Users can insert own tokens" ON user_push_tokens;
CREATE POLICY "Users can insert own tokens" ON user_push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tokens" ON user_push_tokens;
CREATE POLICY "Users can update own tokens" ON user_push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tokens" ON user_push_tokens;
CREATE POLICY "Users can delete own tokens" ON user_push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can read all tokens (for Edge Functions)
DROP POLICY IF EXISTS "Service role can read all tokens" ON user_push_tokens;
CREATE POLICY "Service role can read all tokens" ON user_push_tokens
  FOR SELECT USING (true);
