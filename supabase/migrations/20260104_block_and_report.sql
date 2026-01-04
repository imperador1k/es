-- Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID REFERENCES auth.users(id) NOT NULL,
    blocked_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- RLS for user_blocks
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own blocks"
    ON public.user_blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
    ON public.user_blocks FOR DELETE
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their own blocks"
    ON public.user_blocks FOR SELECT
    USING (auth.uid() = blocker_id);

-- Create user_reports table
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) NOT NULL,
    reported_id UUID REFERENCES auth.users(id) NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for user_reports
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports"
    ON public.user_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
    ON public.user_reports FOR SELECT
    USING (auth.uid() = reporter_id);
