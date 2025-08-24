-- Create a function to get user email by username for authentication
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the user_id from profiles table using username
  SELECT au.email INTO user_email
  FROM public.profiles p
  JOIN auth.users au ON p.user_id = au.id
  WHERE p.username = username_input;
  
  RETURN user_email;
END;
$$;