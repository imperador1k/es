-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  category text CHECK (category = ANY (ARRAY['achievements'::text, 'milestones'::text, 'special'::text, 'secret'::text])),
  condition_type text NOT NULL,
  condition_value integer DEFAULT 1,
  xp_reward integer DEFAULT 0,
  rarity text DEFAULT 'common'::text CHECK (rarity = ANY (ARRAY['common'::text, 'rare'::text, 'epic'::text, 'legendary'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.channel_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_message_id uuid,
  last_read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT channel_reads_pkey PRIMARY KEY (id),
  CONSTRAINT channel_reads_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT channel_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.channels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'chat'::text CHECK (type = ANY (ARRAY['chat'::text, 'announcements'::text, 'resources'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT channels_pkey PRIMARY KEY (id),
  CONSTRAINT channels_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.class_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  subject_id uuid,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  room text,
  type text DEFAULT 'T'::text,
  CONSTRAINT class_schedule_pkey PRIMARY KEY (id),
  CONSTRAINT class_schedule_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT class_schedule_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id)
);
CREATE TABLE public.degrees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  university_id text,
  organic_unit text,
  level text,
  code text,
  CONSTRAINT degrees_pkey PRIMARY KEY (id),
  CONSTRAINT degrees_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id)
);
CREATE TABLE public.dm_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dm_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT dm_conversations_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.profiles(id),
  CONSTRAINT dm_conversations_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.dm_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text])),
  reply_to_id uuid,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  CONSTRAINT dm_messages_pkey PRIMARY KEY (id),
  CONSTRAINT dm_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.dm_conversations(id),
  CONSTRAINT dm_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT dm_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.dm_messages(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  location text,
  type text DEFAULT 'class'::text CHECK (type = ANY (ARRAY['class'::text, 'exam'::text, 'study'::text, 'social'::text])),
  google_event_id text,
  is_synced boolean DEFAULT false,
  recurrence_rule text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.events_system (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type = ANY (ARRAY['xp_boost'::text, 'focus_marathon'::text, 'team_clash'::text, 'login_streak'::text])),
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  banner_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_system_pkey PRIMARY KEY (id)
);
CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'blocked'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT friendships_pkey PRIMARY KEY (id),
  CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id),
  CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid,
  dm_message_id uuid,
  channel_message_id uuid,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT message_reactions_dm_message_id_fkey FOREIGN KEY (dm_message_id) REFERENCES public.dm_messages(id),
  CONSTRAINT message_reactions_channel_message_id_fkey FOREIGN KEY (channel_message_id) REFERENCES public.messages(id),
  CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at timestamp with time zone,
  reply_to_id uuid,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type USER-DEFINED NOT NULL,
  title text NOT NULL,
  content text,
  resource_id uuid,
  resource_type text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.personal_todo_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL,
  content text NOT NULL,
  is_completed boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT personal_todo_steps_pkey PRIMARY KEY (id),
  CONSTRAINT personal_todo_steps_todo_id_fkey FOREIGN KEY (todo_id) REFERENCES public.personal_todos(id)
);
CREATE TABLE public.personal_todos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  tags ARRAY DEFAULT '{}'::text[],
  subject_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT personal_todos_pkey PRIMARY KEY (id),
  CONSTRAINT personal_todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT personal_todos_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
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
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.schools (
  id text NOT NULL,
  name text NOT NULL,
  district text,
  municipality text,
  nature text,
  cycles text,
  CONSTRAINT schools_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shop_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  type text NOT NULL,
  config jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  is_consumable boolean DEFAULT false,
  CONSTRAINT shop_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.study_room_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  attachment_url text,
  attachment_type text,
  attachment_name text,
  CONSTRAINT study_room_messages_pkey PRIMARY KEY (id),
  CONSTRAINT study_room_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.study_rooms(id),
  CONSTRAINT study_room_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.study_room_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  focus_minutes integer DEFAULT 0,
  status text DEFAULT 'focusing'::text,
  last_active timestamp with time zone DEFAULT now(),
  CONSTRAINT study_room_participants_pkey PRIMARY KEY (id),
  CONSTRAINT study_room_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.study_rooms(id),
  CONSTRAINT study_room_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.study_room_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_room_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT study_room_reactions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.study_rooms(id),
  CONSTRAINT study_room_reactions_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id),
  CONSTRAINT study_room_reactions_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.study_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  emoji text DEFAULT '📚'::text,
  theme text DEFAULT 'default'::text,
  max_participants integer DEFAULT 20,
  is_public boolean DEFAULT true,
  team_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  music_url text,
  background_color text DEFAULT '#1F2937'::text,
  is_custom boolean DEFAULT false,
  password text,
  current_track_url text,
  current_track_name text DEFAULT 'Nenhuma'::text,
  is_music_playing boolean DEFAULT false,
  dj_user_id uuid,
  CONSTRAINT study_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT study_rooms_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT study_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT study_rooms_dj_user_id_fkey FOREIGN KEY (dj_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.study_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  subject_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  duration_minutes integer,
  xp_earned integer DEFAULT 0,
  CONSTRAINT study_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT study_sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id)
);
CREATE TABLE public.task_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid,
  group_id uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  CONSTRAINT task_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT task_assignments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.task_groups(id),
  CONSTRAINT task_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_group_members_pkey PRIMARY KEY (id),
  CONSTRAINT task_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.task_groups(id),
  CONSTRAINT task_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_groups_pkey PRIMARY KEY (id),
  CONSTRAINT task_groups_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.task_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  group_id uuid,
  content text,
  file_url text,
  file_name text,
  file_type text,
  file_size integer,
  link_url text,
  status text DEFAULT 'submitted'::text CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'graded'::text, 'returned'::text])),
  score integer,
  feedback text,
  graded_by uuid,
  graded_at timestamp with time zone,
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_late boolean DEFAULT false,
  CONSTRAINT task_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT task_submissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.task_groups(id),
  CONSTRAINT task_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  is_completed boolean DEFAULT false,
  type text DEFAULT 'study'::text CHECK (type = ANY (ARRAY['study'::text, 'exam'::text, 'assignment'::text])),
  xp_reward integer DEFAULT 50,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  subject_id uuid,
  team_id uuid,
  created_by uuid,
  config jsonb DEFAULT '{"max_score": 20, "assignment_type": "individual", "allowed_file_types": ["pdf", "jpg", "png", "docx"], "requires_file_upload": false, "allow_late_submissions": false}'::jsonb,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text, 'archived'::text])),
  allow_late_submissions boolean DEFAULT false,
  published_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT tasks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.user_subjects(id),
  CONSTRAINT tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.team_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  team_id uuid NOT NULL,
  uploader_id uuid NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  size_bytes bigint,
  is_folder boolean DEFAULT false,
  parent_id uuid,
  CONSTRAINT team_files_pkey PRIMARY KEY (id),
  CONSTRAINT team_files_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_files_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES auth.users(id),
  CONSTRAINT team_files_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.team_files(id)
);
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'moderator'::text, 'delegate'::text, 'member'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.team_task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_task_completions_pkey PRIMARY KEY (id),
  CONSTRAINT team_task_completions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT team_task_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  icon_url text,
  invite_code text DEFAULT substr(md5((random())::text), 0, 7) UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  color text DEFAULT '#6366f1'::text,
  is_public boolean DEFAULT false,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.universities (
  id text NOT NULL,
  name text NOT NULL,
  type text,
  district text,
  CONSTRAINT universities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  badge_id uuid,
  unlocked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id)
);
CREATE TABLE public.user_education (
  user_id uuid NOT NULL,
  level USER-DEFINED NOT NULL,
  school_id text,
  year integer,
  secondary_course_area text,
  university_id text,
  degree_id uuid,
  uni_year integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_education_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_education_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_education_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT user_education_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id),
  CONSTRAINT user_education_degree_id_fkey FOREIGN KEY (degree_id) REFERENCES public.degrees(id)
);
CREATE TABLE public.user_inventory (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  purchased_at timestamp with time zone DEFAULT now(),
  is_equipped boolean DEFAULT false,
  CONSTRAINT user_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT user_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.shop_items(id),
  CONSTRAINT user_inventory_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_push_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  device_type text,
  CONSTRAINT user_push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  color text DEFAULT '#6366f1'::text,
  teacher_name text,
  room text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT user_subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.xp_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  source text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT xp_history_pkey PRIMARY KEY (id),
  CONSTRAINT xp_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);