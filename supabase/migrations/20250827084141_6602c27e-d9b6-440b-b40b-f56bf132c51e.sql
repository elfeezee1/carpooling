-- Fix function search path security warning by updating existing functions
ALTER FUNCTION public.get_user_email_by_username(text) SET search_path = 'public';