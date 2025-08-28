import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Clock, 
  Calendar,
  Users,
  Eye,
  Star,
  DollarSign,
  Phone,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  status: string;
  number_of_passengers: number;
  pickup_location?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  message?: string;
  created_at: string;
  updated_at: string;
  rides: {
    id: string;
    origin: string;
    destination: string;
    intermediate_stop?: string;
    departure_date: string;
    departure_time: string;
    price_per_seat: number;
    car_details?: string;
    status: string;
    profiles: {
      username: string;
      total_rating?: number;
      rating_count?: number;
      phone_number?: string;
    } | null;
  } | null;
}

export const MyBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyBookings();
      
      // Set up real-time subscription for ride request updates
      const rideRequestsChannel = supabase
        .channel('ride-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_requests',
            filter: `passenger_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Ride request update:', payload);
            fetchMyBookings(); // Refresh bookings when any change occurs
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(rideRequestsChannel);
      };
    }
  }, [user]);

  const fetchMyBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          rides (
            id,
            driver_id,
            origin,
            destination,
            intermediate_stop,
            departure_date,
            departure_time,
            price_per_seat,
            car_details,
            status
          )
        `)
        .eq('passenger_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process the data and fetch driver profiles separately
      const processedBookings = await Promise.all(
        (data || [])
          .filter(item => item.rides)
          .map(async (item) => {
            const { data: driverProfile } = await supabase
              .from('profiles')
              .select('username, total_rating, rating_count, phone_number')
              .eq('user_id', item.rides?.driver_id || '')
              .maybeSingle();

            return {
              ...item,
              rides: item.rides ? {
                ...item.rides,
                profiles: driverProfile
              } : null
            } as Booking;
          })
      );
      
      setBookings(processedBookings);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load your bookings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('ride_requests')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Booking ${status} successfully`
      });

      fetchMyBookings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update booking',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'pending':
        return 'outline';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const canCancelBooking = (booking: Booking) => {
    return ['pending', 'accepted'].includes(booking.status) && 
           booking.rides?.status === 'active';
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
        <h3 className="text-xl font-semibold">My Bookings</h3>
        <Badge variant="outline">{bookings.length} bookings</Badge>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bookings yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Search for rides to make your first booking!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={getStatusColor(booking.status)} className="capitalize">
                        {booking.status === 'pending' && '⏳ '}
                        {booking.status === 'accepted' && '✅ '}
                        {booking.status === 'rejected' && '❌ '}
                        {booking.status === 'cancelled' && '🚫 '}
                        {booking.status}
                      </Badge>
                      <Badge variant={getStatusColor(booking.rides?.status || 'unknown')} className="bg-muted">
                        Ride: {booking.rides?.status || 'Unknown'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{booking.rides?.origin || 'Unknown'}</span>
                      </div>
                      
                      {booking.rides?.intermediate_stop && (
                        <div className="flex items-center space-x-2 ml-6">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                          <span className="text-sm text-muted-foreground">{booking.rides?.intermediate_stop}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="font-medium">{booking.rides?.destination || 'Unknown'}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-3">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{booking.rides?.departure_date ? format(new Date(booking.rides.departure_date), 'MMM dd') : 'TBD'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{booking.rides?.departure_time || 'TBD'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{booking.number_of_passengers} passenger(s)</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>₦{(booking.rides?.price_per_seat || 0) * booking.number_of_passengers}</span>
                        </div>
                      </div>

                      <div className="mt-3 p-2 bg-muted rounded-md">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">{booking.rides?.profiles?.username || 'Unknown Driver'}</span>
                          {booking.rides?.profiles?.total_rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-sm">{booking.rides?.profiles?.total_rating?.toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">
                                ({booking.rides?.profiles?.rating_count} reviews)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {booking.pickup_location && (
                        <div className="text-sm">
                          <span className="font-medium">Pickup: </span>
                          <span>{booking.pickup_location}</span>
                        </div>
                      )}

                      {booking.message && (
                        <div className="text-sm italic text-muted-foreground">
                          "{booking.message}"
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
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Booking Details</DialogTitle>
                        </DialogHeader>
                        {selectedBooking && selectedBooking.rides && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Route</label>
                                <p className="text-sm">{selectedBooking.rides.origin} → {selectedBooking.rides.destination}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Date & Time</label>
                                <p className="text-sm">
                                  {format(new Date(selectedBooking.rides.departure_date), 'MMM dd, yyyy')} at {selectedBooking.rides.departure_time}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Passengers</label>
                                <p className="text-sm">{selectedBooking.number_of_passengers}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Total Cost</label>
                                <p className="text-sm">₦{selectedBooking.rides.price_per_seat * selectedBooking.number_of_passengers}</p>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Driver</label>
                              <div className="flex items-center space-x-2 mt-1">
                                <span>{selectedBooking.rides.profiles?.username || 'Unknown Driver'}</span>
                                {selectedBooking.rides.profiles?.total_rating && (
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-3 h-3 text-yellow-500" />
                                    <span className="text-sm">{selectedBooking.rides.profiles.total_rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {selectedBooking.pickup_location && (
                              <div>
                                <label className="text-sm font-medium">Pickup Location</label>
                                <p className="text-sm">{selectedBooking.pickup_location}</p>
                              </div>
                            )}

                            {selectedBooking.rides.car_details && (
                              <div>
                                <label className="text-sm font-medium">Car Details</label>
                                <p className="text-sm">{selectedBooking.rides.car_details}</p>
                              </div>
                            )}

                            {selectedBooking.status === 'accepted' && (
                              <div className="flex space-x-2 pt-4">
                                {selectedBooking.rides.profiles?.phone_number && (
                                  <Button
                                    variant="outline"
                                    onClick={() => window.open(`tel:${selectedBooking.rides?.profiles?.phone_number}`, '_self')}
                                    className="flex-1"
                                  >
                                    <Phone className="w-4 h-4 mr-2" />
                                    Call Driver
                                  </Button>
                                )}
                                <Button variant="outline" className="flex-1">
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Message
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {canCancelBooking(booking) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      >
                        Cancel
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