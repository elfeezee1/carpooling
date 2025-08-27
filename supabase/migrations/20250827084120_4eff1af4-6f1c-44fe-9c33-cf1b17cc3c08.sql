-- Add availability status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN availability_status TEXT NOT NULL DEFAULT 'offline' 
CHECK (availability_status IN ('online', 'offline', 'busy'));

-- Add last_seen timestamp for tracking when drivers were last active
ALTER TABLE public.profiles 
ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for better performance when querying by availability
CREATE INDEX idx_profiles_availability_status ON public.profiles(availability_status);
CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen);