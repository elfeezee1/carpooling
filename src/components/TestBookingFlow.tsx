import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, Clock, Users, DollarSign, User } from 'lucide-react';

interface TestRide {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  driver_id: string;
  driver_profile: {
    username: string;
  };
}

const TestBookingFlow = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testRides, setTestRides] = useState<TestRide[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOtherUsersRides = async () => {
    setLoading(true);
    try {
      // Get rides from other users (not current user)
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gte('available_seats', 1)
        .neq('driver_id', user?.id)
        .limit(3);

      if (ridesError) throw ridesError;

      if (!ridesData || ridesData.length === 0) {
        setTestRides([]);
        return;
      }

      // Get driver profiles
      const driverIds = ridesData.map(ride => ride.driver_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', driverIds);

      if (profilesError) throw profilesError;

      // Combine data
      const ridesWithProfiles = ridesData.map(ride => ({
        ...ride,
        driver_profile: profiles?.find(p => p.user_id === ride.driver_id) || { username: 'Unknown' }
      }));

      setTestRides(ridesWithProfiles as TestRide[]);
    } catch (error: any) {
      console.error('Error fetching test rides:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test rides',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestBooking = async (rideId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ride_requests')
        .insert({
          ride_id: rideId,
          passenger_id: user.id,
          number_of_passengers: 1,
          status: 'pending',
          message: 'Test booking from dashboard'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test booking sent! Check your bookings to see the status.',
      });

      // Refresh rides
      fetchOtherUsersRides();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🧪 Test Booking Flow
          <Button 
            variant="outline" 
            onClick={fetchOtherUsersRides}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Find Test Rides'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Click "Find Test Rides" to see rides from other users that you can book to test the notification system.
        </p>

        {testRides.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {loading ? 'Loading...' : 'No test rides available. Create rides with different accounts to test.'}
          </div>
        ) : (
          <div className="space-y-3">
            {testRides.map((ride) => (
              <div key={ride.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{ride.origin} → {ride.destination}</span>
                  </div>
                  <Badge variant="outline">
                    <User className="w-3 h-3 mr-1" />
                    {ride.driver_profile.username}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(ride.departure_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {ride.departure_time}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {ride.available_seats} seats
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" />
                    ₦{ride.price_per_seat}
                  </div>
                </div>

                <Button 
                  size="sm" 
                  onClick={() => handleTestBooking(ride.id)}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  Test Book This Ride
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestBookingFlow;