import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Car, 
  MapPin, 
  Clock, 
  Calendar,
  Users,
  Eye,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface Ride {
  id: string;
  origin: string;
  destination: string;
  intermediate_stop?: string;
  departure_date: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  car_details?: string;
  status: string;
  created_at: string;
  ride_requests?: any[];
}

export const MyRides = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyRides();
    }
  }, [user]);

  const fetchMyRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          ride_requests (
            id,
            passenger_id,
            status,
            number_of_passengers,
            pickup_location,
            message,
            profiles!passenger_id (
              username
            )
          )
        `)
        .eq('driver_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRides(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load your rides',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRideStatus = async (rideId: string, status: string) => {
    try {
      console.log('Updating ride status:', { rideId, status, userId: user?.id });
      
      const { error } = await supabase
        .from('rides')
        .update({ status })
        .eq('id', rideId);

      if (error) {
        console.error('Error updating ride status:', error);
        throw error;
      }

      console.log('Ride status updated successfully');

      toast({
        title: 'Success',
        description: `Ride ${status} successfully`
      });

      fetchMyRides();
    } catch (error: any) {
      console.error('Failed to update ride status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ride status',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">My Rides</h3>
        <Badge variant="outline">{rides.length} rides</Badge>
      </div>

      {rides.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No rides created yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first ride to start earning!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rides.map((ride) => (
            <Card key={ride.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={getStatusColor(ride.status)}>
                        {ride.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(ride.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{ride.origin}</span>
                      </div>
                      
                      {ride.intermediate_stop && (
                        <div className="flex items-center space-x-2 ml-6">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                          <span className="text-sm text-muted-foreground">{ride.intermediate_stop}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="font-medium">{ride.destination}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-3">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(ride.departure_date), 'MMM dd')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{ride.departure_time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{ride.available_seats} seats</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>₦{ride.price_per_seat}</span>
                        </div>
                      </div>

                      {ride.ride_requests && ride.ride_requests.length > 0 && (
                        <div className="mt-3 p-2 bg-muted rounded-md">
                          <p className="text-sm font-medium">
                            {ride.ride_requests.length} request(s)
                          </p>
                          <div className="text-xs text-muted-foreground">
                            {ride.ride_requests.filter(r => r.status === 'pending').length} pending, {' '}
                            {ride.ride_requests.filter(r => r.status === 'accepted').length} accepted
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRide(ride)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Ride Details</DialogTitle>
                        </DialogHeader>
                        {selectedRide && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Route</label>
                                <p className="text-sm">{selectedRide.origin} → {selectedRide.destination}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Date & Time</label>
                                <p className="text-sm">
                                  {format(new Date(selectedRide.departure_date), 'MMM dd, yyyy')} at {selectedRide.departure_time}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Available Seats</label>
                                <p className="text-sm">{selectedRide.available_seats}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Price per Seat</label>
                                <p className="text-sm">₦{selectedRide.price_per_seat}</p>
                              </div>
                            </div>
                            
                            {selectedRide.car_details && (
                              <div>
                                <label className="text-sm font-medium">Car Details</label>
                                <p className="text-sm">{selectedRide.car_details}</p>
                              </div>
                            )}

                            {selectedRide.ride_requests && selectedRide.ride_requests.length > 0 && (
                              <div>
                                <label className="text-sm font-medium">Ride Requests</label>
                                <div className="space-y-2 mt-2">
                                  {selectedRide.ride_requests.map((request) => (
                                    <div key={request.id} className="p-2 border rounded-md">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{request.profiles?.username}</span>
                                        <Badge variant={getStatusColor(request.status)}>
                                          {request.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {request.number_of_passengers} passenger(s)
                                      </p>
                                      {request.pickup_location && (
                                        <p className="text-sm">Pickup: {request.pickup_location}</p>
                                      )}
                                      {request.message && (
                                        <p className="text-sm italic">"{request.message}"</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex space-x-2 pt-4">
                              {selectedRide.status === 'active' && (
                                <>
                                  <Button
                                    onClick={() => updateRideStatus(selectedRide.id, 'completed')}
                                    className="flex-1"
                                  >
                                    Mark as Completed
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => updateRideStatus(selectedRide.id, 'cancelled')}
                                    className="flex-1"
                                  >
                                    Cancel Ride
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {ride.status === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateRideStatus(ride.id, 'cancelled')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};