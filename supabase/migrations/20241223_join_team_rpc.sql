-- ============================================
-- RPC: Join Team via Invite Code
-- Execute this in Supabase SQL Editor
-- ============================================

-- This function allows users to join a team using an invite code
-- Returns the team_id if successful, null if failed

CREATE OR REPLACE FUNCTION join_team_via_code(
    code_input TEXT,
    user_id_input UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_id UUID;
    v_existing_member UUID;
BEGIN
    -- Find team with this invite code
    SELECT id INTO v_team_id
    FROM teams
    WHERE UPPER(invite_code) = UPPER(code_input);
    
    -- If no team found, return null
    IF v_team_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Check if already a member
    SELECT id INTO v_existing_member
    FROM team_members
    WHERE team_id = v_team_id
    AND user_id = user_id_input;
    
    -- If already member, return null
    IF v_existing_member IS NOT NULL THEN
        RETURN NULL;
    END IF;
    
    -- Insert as member
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (v_team_id, user_id_input, 'member');
    
    RETURN v_team_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_team_via_code(TEXT, UUID) TO authenticated;
