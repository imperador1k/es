-- ============================================================
-- 1. EXTENSÕES E TIPOS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    -- Create custom types
    CREATE TYPE public.education_level AS ENUM (
        'basic_2',
        'basic_3',
        'secondary',
        'university'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. TABELAS DE BASE (Nível 0 e 1)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE,
  full_name text,
  avatar_url text,
  current_tier text DEFAULT 'Bronze'::text CHECK (current_tier = ANY (ARRAY['Bronze'::text, 'Prata'::text, 'Ouro'::text, 'Platina'::text, 'Diamante'::text, 'Elite'::text])),
  current_xp integer DEFAULT 0,
  focus_minutes_total integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  status text DEFAULT 'offline'::text CHECK (status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text, 'dnd'::text])),
  last_seen_at timestamp with time zone DEFAULT now(),
  last_daily_spin timestamp with time zone,
  push_token text,
  streak_freezes integer DEFAULT 0,
  xp_multiplier numeric DEFAULT 1.0,
  xp_multiplier_expires timestamp with time zone,
  equipped_title text,
  equipped_frame uuid,
  current_theme text DEFAULT 'default'::text,
  streak_current integer DEFAULT 0,
  streak_longest integer DEFAULT 0,
  last_streak_date date
);

CREATE TABLE IF NOT EXISTS public.schools (
  id text PRIMARY KEY,
  name text NOT NULL,
  district text,
  municipality text,
  nature text,
  cycles text
);

CREATE TABLE IF NOT EXISTS public.universities (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text,
  district text
);

CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  type text NOT NULL,
  config jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  is_consumable boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  category text CHECK (category = ANY (ARRAY['achievements'::text, 'milestones'::text, 'special'::text, 'secret'::text])),
  condition_type text NOT NULL,
  condition_value integer DEFAULT 1,
  xp_reward integer DEFAULT 0,
  rarity text DEFAULT 'common'::text CHECK (rarity = ANY (ARRAY['common'::text, 'rare'::text, 'epic'::text, 'legendary'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 3. TABELAS DE NÍVEL 1 (Dependem das Tabelas de Base)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.events_system (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type = ANY (ARRAY['xp_boost'::text, 'focus_marathon'::text, 'team_clash'::text, 'login_streak'::text])),
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  banner_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_url text,
  invite_code text DEFAULT substr(md5((random())::text), 0, 7) UNIQUE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  color text DEFAULT '#6366f1'::text,
  is_public boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  color text DEFAULT '#6366f1'::text,
  teacher_name text,
  room text,
  created_at timestamp with time zone DEFAULT now(),
  image_url text
);

CREATE TABLE IF NOT EXISTS public.degrees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  university_id text REFERENCES public.universities(id),
  organic_unit text,
  level text,
  code text
);

-- ============================================================
-- 4. TABELAS DE NÍVEL 2
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'moderator'::text, 'delegate'::text, 'member'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  name text NOT NULL,
  type text DEFAULT 'chat'::text CHECK (type = ANY (ARRAY['chat'::text, 'announcements'::text, 'resources'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  is_completed boolean DEFAULT false,
  type text DEFAULT 'study'::text CHECK (type = ANY (ARRAY['study'::text, 'exam'::text, 'assignment'::text])),
  xp_reward integer DEFAULT 50,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  subject_id uuid REFERENCES public.user_subjects(id),
  team_id uuid REFERENCES public.teams(id),
  created_by uuid REFERENCES public.profiles(id),
  config jsonb DEFAULT '{"max_score": 20, "assignment_type": "individual", "allowed_file_types": ["pdf", "jpg", "png", "docx"], "requires_file_upload": false, "allow_late_submissions": false}'::jsonb,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text, 'archived'::text])),
  allow_late_submissions boolean DEFAULT false,
  published_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id),
  addressee_id uuid NOT NULL REFERENCES public.profiles(id),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'blocked'::text])),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  item_id uuid NOT NULL REFERENCES public.shop_items(id),
  purchased_at timestamp with time zone DEFAULT now(),
  is_equipped boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  badge_id uuid REFERENCES public.badges(id),
  unlocked_at timestamp with time zone DEFAULT now(),
  is_equipped boolean DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- ============================================================
-- 5. TABELAS DE NÍVEL 3 (Lógica e Detalhe)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at timestamp with time zone,
  reply_to_id uuid REFERENCES public.messages(id),
  attachment_url text,
  attachment_type text,
  attachment_name text
);

CREATE TABLE IF NOT EXISTS public.channel_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  last_read_message_id uuid,
  last_read_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  name text NOT NULL,
  color text DEFAULT '#6366f1'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.task_groups(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  joined_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  user_id uuid REFERENCES public.profiles(id),
  group_id uuid REFERENCES public.task_groups(id),
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  group_id uuid REFERENCES public.task_groups(id),
  content text,
  file_url text,
  file_name text,
  file_type text,
  file_size integer,
  link_url text,
  status text DEFAULT 'submitted'::text CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'graded'::text, 'returned'::text])),
  score integer,
  feedback text,
  graded_by uuid REFERENCES public.profiles(id),
  graded_at timestamp with time zone,
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_late boolean DEFAULT false,
  comment text
);

CREATE TABLE IF NOT EXISTS public.team_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  uploader_id uuid NOT NULL REFERENCES public.profiles(id),
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  size_bytes bigint,
  is_folder boolean DEFAULT false,
  parent_id uuid REFERENCES public.team_files(id),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES public.profiles(id),
  user2_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id),
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  file_url text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text])),
  reply_to_id uuid REFERENCES public.dm_messages(id),
  attachment_url text,
  attachment_type text,
  attachment_name text
);

CREATE TABLE IF NOT EXISTS public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  emoji text DEFAULT '📚'::text,
  theme text DEFAULT 'default'::text,
  max_participants integer DEFAULT 20,
  is_public boolean DEFAULT true,
  team_id uuid REFERENCES public.teams(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  music_url text,
  background_color text DEFAULT '#1F2937'::text,
  is_custom boolean DEFAULT false,
  password text,
  current_track_url text,
  current_track_name text DEFAULT 'Nenhuma'::text,
  is_music_playing boolean DEFAULT false,
  dj_user_id uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.user_education (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  level public.education_level NOT NULL,
  school_id text REFERENCES public.schools(id),
  year integer,
  secondary_course_area text,
  university_id text REFERENCES public.universities(id),
  degree_id uuid REFERENCES public.degrees(id),
  uni_year integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  actor_id uuid REFERENCES public.profiles(id),
  type text NOT NULL,
  title text NOT NULL,
  content text,
  resource_id uuid,
  resource_type text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES public.profiles(id),
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.xp_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  amount integer NOT NULL,
  source text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 6. TABELAS DE NÍVEL 4 (Detalhe e Interação)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.personal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  tags text[] DEFAULT '{}'::text[],
  subject_id uuid REFERENCES public.user_subjects(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personal_todo_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES public.personal_todos(id),
  content text NOT NULL,
  is_completed boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id),
  dm_message_id uuid REFERENCES public.dm_messages(id),
  channel_message_id uuid REFERENCES public.messages(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  attachment_url text,
  attachment_type text,
  attachment_name text
);

CREATE TABLE IF NOT EXISTS public.study_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  joined_at timestamp with time zone DEFAULT now(),
  focus_minutes integer DEFAULT 0,
  status text DEFAULT 'focusing'::text,
  last_active timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_room_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id),
  to_user_id uuid REFERENCES public.profiles(id),
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  subject_id uuid REFERENCES public.user_subjects(id),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  duration_minutes integer,
  xp_earned integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.class_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  subject_id uuid REFERENCES public.user_subjects(id),
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  room text,
  type text DEFAULT 'T'::text
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  location text,
  type text DEFAULT 'class'::text CHECK (type = ANY (ARRAY['class'::text, 'exam'::text, 'test'::text, 'study'::text, 'social'::text, 'presentation'::text, 'assignment'::text, 'holiday'::text, 'other'::text])),
  google_event_id text,
  is_synced boolean DEFAULT false,
  recurrence_rule text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  action_type text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id),
  reported_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (char_length(reason) > 0),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text, 'action_taken'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id),
  blocked_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  device_type text
);

CREATE TABLE IF NOT EXISTS public.user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  target_value integer NOT NULL,
  current_value integer DEFAULT 0,
  goal_type text NOT NULL CHECK (goal_type = ANY (ARRAY['study_minutes'::text, 'tasks_completed'::text, 'streak_days'::text, 'xp_earned'::text])),
  deadline timestamp with time zone,
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
