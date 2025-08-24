-- Add foreign key relationship between rides.driver_id and profiles.user_id
ALTER TABLE public.rides 
ADD CONSTRAINT rides_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;