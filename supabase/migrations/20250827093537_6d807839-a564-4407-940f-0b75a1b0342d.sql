-- Create a trigger function to handle ride completion
CREATE OR REPLACE FUNCTION public.handle_ride_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'Ride completion trigger fired for ride %', NEW.id;
  
  -- Only proceed if the ride status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    RAISE LOG 'Processing ride completion for ride % by driver %', NEW.id, NEW.driver_id;
    
    -- You can add any additional logic here when a ride is completed
    -- For example: automatic notifications, payment processing, etc.
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ride completion
DROP TRIGGER IF EXISTS on_ride_completion ON public.rides;
CREATE TRIGGER on_ride_completion
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ride_completion();

-- Enable realtime for the tables
ALTER TABLE public.rides REPLICA IDENTITY FULL;
ALTER TABLE public.ride_requests REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;