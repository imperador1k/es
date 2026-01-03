-- Use this SQL in Supabase SQL Editor to create the delete function
-- Security Definer allows the function to bypass RLS and delete from auth.users

create or replace function delete_user_account()
returns void
language plpgsql
security definer
as $$
begin
  -- Delete the executing user
  delete from auth.users where id = auth.uid();
end;
$$;
