import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Check, 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  User,
  DollarSign
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  ride_id?: string;
  is_read: boolean;
  created_at: string;
}

interface RideRequest {
  id: string;
  ride_id: string;
  passenger_id: string;
  number_of_passengers: number;
  status: string;
  message?: string;
  created_at: string;
  rides: {
    origin: string;
    destination: string;
    departure_date: string;
    departure_time: string;
    price_per_seat: number;
  };
  passenger_profile: {
    username: string;
    total_rating?: number;
    rating_count?: number;
  };
}

const NotificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPendingRideRequests();
      
      // Set up real-time subscriptions
      const notificationsChannel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_requests'
          },
          () => {
            fetchPendingRideRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notificationsChannel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchPendingRideRequests = async () => {
    try {
      // First get the ride requests for rides the user is driving
      const { data: requests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          rides!inner (
            origin,
            destination,
            departure_date,
            departure_time,
            price_per_seat,
            driver_id
          )
        `)
        .eq('status', 'pending')
        .eq('rides.driver_id', user?.id);

      if (requestsError) throw requestsError;

      if (!requests || requests.length === 0) {
        setRideRequests([]);
        return;
      }

      // Get passenger profiles separately
      const passengerIds = requests.map(req => req.passenger_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, total_rating, rating_count')
        .in('user_id', passengerIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const requestsWithProfiles = requests.map(request => ({
        ...request,
        passenger_profile: profiles?.find(p => p.user_id === request.passenger_id) || null
      }));

      setRideRequests(requestsWithProfiles as RideRequest[]);
    } catch (error: any) {
      console.error('Error fetching ride requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ride requests',
        variant: 'destructive',
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleRideRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ride_requests')
        .update({ status: action })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Ride request ${action} successfully!`,
      });

      fetchPendingRideRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {(unreadCount > 0 || rideRequests.length > 0) && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount + rideRequests.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notifications
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pending Ride Requests */}
          {rideRequests.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-primary">Pending Ride Requests</h3>
              <div className="space-y-3">
                {rideRequests.map((request) => (
                  <Card key={request.id} className="border-primary/20">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {/* Route and Trip Info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{request.rides.origin}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm font-medium">{request.rides.destination}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {request.number_of_passengers} passenger{request.number_of_passengers > 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* Date and Time */}
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(request.rides.departure_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {request.rides.departure_time}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            ₦{request.rides.price_per_seat}
                          </div>
                        </div>

                        {/* Passenger Info */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{request.passenger_profile?.username}</span>
                            {request.passenger_profile?.total_rating && (
                              <span className="text-xs text-muted-foreground">
                                ⭐ {request.passenger_profile.total_rating.toFixed(1)} ({request.passenger_profile.rating_count} reviews)
                              </span>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRideRequest(request.id, 'rejected')}
                              disabled={loading}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRideRequest(request.id, 'accepted')}
                              disabled={loading}
                              style={{ background: 'var(--gradient-primary)' }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                          </div>
                        </div>

                        {request.message && (
                          <div className="p-2 bg-secondary rounded text-sm">
                            <strong>Message:</strong> {request.message}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Other Notifications */}
          <div>
            <h3 className="font-semibold mb-3">Recent Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No notifications yet
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`cursor-pointer transition-colors ${!notification.is_read ? 'bg-primary/5 border-primary/20' : 'hover:bg-secondary/50'}`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <CardContent className="py-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationCenter;
