-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  avatar_url TEXT,
  bio TEXT,
  total_rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rides table
CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  intermediate_stop TEXT,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  available_seats INTEGER NOT NULL CHECK (available_seats > 0),
  price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat >= 0),
  car_details TEXT,
  origin_lat DECIMAL(10,8),
  origin_lng DECIMAL(11,8),
  destination_lat DECIMAL(10,8),
  destination_lng DECIMAL(11,8),
  intermediate_lat DECIMAL(10,8),
  intermediate_lng DECIMAL(11,8),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ride requests table
CREATE TABLE public.ride_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number_of_passengers INTEGER NOT NULL DEFAULT 1 CHECK (number_of_passengers > 0),
  pickup_location TEXT,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ride_id, passenger_id)
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ride_id, rater_id, rated_user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ride_request', 'request_accepted', 'request_rejected', 'ride_started', 'ride_completed', 'new_message')),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for rides
CREATE POLICY "Rides are viewable by everyone" 
ON public.rides 
FOR SELECT 
USING (true);

CREATE POLICY "Drivers can manage their own rides" 
ON public.rides 
FOR ALL 
USING (auth.uid() = driver_id);

-- Create policies for ride requests
CREATE POLICY "Users can view requests for their rides or their own requests" 
ON public.ride_requests 
FOR SELECT 
USING (
  auth.uid() = passenger_id OR 
  auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id)
);

CREATE POLICY "Passengers can create requests" 
ON public.ride_requests 
FOR INSERT 
WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers can update their own requests" 
ON public.ride_requests 
FOR UPDATE 
USING (auth.uid() = passenger_id);

CREATE POLICY "Drivers can update requests for their rides" 
ON public.ride_requests 
FOR UPDATE 
USING (auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id));

-- Create policies for ratings
CREATE POLICY "Users can view all ratings" 
ON public.ratings 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create ratings for completed rides they participated in" 
ON public.ratings 
FOR INSERT 
WITH CHECK (
  auth.uid() = rater_id AND
  EXISTS (
    SELECT 1 FROM public.rides r 
    WHERE r.id = ride_id 
    AND r.status = 'completed'
    AND (r.driver_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.ride_requests rr 
                WHERE rr.ride_id = r.id 
                AND rr.passenger_id = auth.uid() 
                AND rr.status = 'accepted'))
  )
);

-- Create policies for messages
CREATE POLICY "Users can view messages for rides they participate in" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id) OR
  auth.uid() IN (SELECT passenger_id FROM public.ride_requests WHERE ride_id = messages.ride_id AND status = 'accepted')
);

CREATE POLICY "Users can send messages for rides they participate in" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND (
    auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id) OR
    auth.uid() IN (SELECT passenger_id FROM public.ride_requests WHERE ride_id = messages.ride_id AND status = 'accepted')
  )
);

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rides_updated_at
    BEFORE UPDATE ON public.rides
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ride_requests_updated_at
    BEFORE UPDATE ON public.ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone_number'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update user ratings
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    total_rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM public.ratings 
      WHERE rated_user_id = NEW.rated_user_id
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM public.ratings 
      WHERE rated_user_id = NEW.rated_user_id
    )
  WHERE user_id = NEW.rated_user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update ratings
CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_rating();

-- Add indexes for better performance
CREATE INDEX idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX idx_rides_departure_date ON public.rides(departure_date);
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_ride_requests_ride_id ON public.ride_requests(ride_id);
CREATE INDEX idx_ride_requests_passenger_id ON public.ride_requests(passenger_id);
CREATE INDEX idx_ratings_rated_user_id ON public.ratings(rated_user_id);
CREATE INDEX idx_messages_ride_id ON public.messages(ride_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);