-- Create function to handle new ride requests and send notifications
CREATE OR REPLACE FUNCTION public.handle_new_ride_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  driver_id_var UUID;
  ride_info RECORD;
BEGIN
  -- Get ride information and driver ID
  SELECT r.driver_id, r.origin, r.destination, r.departure_date, r.departure_time
  INTO ride_info
  FROM rides r
  WHERE r.id = NEW.ride_id;
  
  -- Create notification for the driver
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    ride_id,
    is_read
  ) VALUES (
    ride_info.driver_id,
    'ride_request',
    'New Ride Request',
    'You have a new ride request from ' || ride_info.origin || ' to ' || ride_info.destination || ' on ' || ride_info.departure_date,
    NEW.ride_id,
    false
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new ride requests
CREATE TRIGGER on_ride_request_created
  AFTER INSERT ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_ride_request();

-- Create function to handle ride request status updates
CREATE OR REPLACE FUNCTION public.handle_ride_request_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ride_info RECORD;
  passenger_profile RECORD;
BEGIN
  -- Only proceed if status changed
  IF NEW.status != OLD.status THEN
    -- Get ride information
    SELECT r.origin, r.destination, r.departure_date, r.departure_time
    INTO ride_info
    FROM rides r
    WHERE r.id = NEW.ride_id;
    
    -- Get passenger profile info
    SELECT p.username
    INTO passenger_profile
    FROM profiles p
    WHERE p.user_id = NEW.passenger_id;
    
    -- Create notification for the passenger about status change
    IF NEW.status = 'accepted' THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        ride_id,
        is_read
      ) VALUES (
        NEW.passenger_id,
        'ride_request_accepted',
        'Ride Request Accepted!',
        'Your ride request from ' || ride_info.origin || ' to ' || ride_info.destination || ' has been accepted',
        NEW.ride_id,
        false
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        ride_id,
        is_read
      ) VALUES (
        NEW.passenger_id,
        'ride_request_rejected',
        'Ride Request Declined',
        'Your ride request from ' || ride_info.origin || ' to ' || ride_info.destination || ' has been declined',
        NEW.ride_id,
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ride request status updates
CREATE TRIGGER on_ride_request_status_updated
  AFTER UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_ride_request_status_update();