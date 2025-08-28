
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { RecentActivity } from '@/components/RecentActivity';
import { MyRides } from '@/components/MyRides';
import { MyBookings } from '@/components/MyBookings';
import { EditProfile } from '@/components/EditProfile';
import NotificationCenter from '@/components/NotificationCenter';
import { 
  Car, 
  Users, 
  MapPin, 
  Clock, 
  Plus, 
  Search, 
  Phone, 
  MessageCircle,
  Star,
  Bell,
  LogOut,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Ride {
  id: string;
  driver_id: string;
  origin: string;
  destination: string;
  intermediate_stop?: string;
  departure_date: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  car_details?: string;
  status: string;
  driver_profile: {
    username: string;
    total_rating?: number;
    rating_count?: number;
  } | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completedRides: 0,
    connections: 0,
    pendingRequests: 0
  });
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [ridesLoading, setRidesLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
      fetchAvailableRides();
      
      // Set up real-time subscriptions for rides and ride_requests
      const ridesChannel = supabase
        .channel('rides-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rides'
          },
           (payload) => {
             console.log('Rides table change:', payload);
             fetchStats(); // Refresh stats when rides change
             fetchAvailableRides(); // Refresh available rides
           }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_requests'
          },
           (payload) => {
             console.log('Ride requests table change:', payload);
             fetchStats(); // Refresh stats when ride requests change
             fetchAvailableRides(); // Refresh available rides
           }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ridesChannel);
      };
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
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

  const fetchStats = async () => {
    try {
      console.log('Fetching stats for user:', user?.id);
      
      // Get completed rides count (as driver)
      const { count: completedAsDriver } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', user?.id)
        .eq('status', 'completed');

      console.log('Completed rides as driver:', completedAsDriver);

      // Get completed rides count (as passenger)
      const { count: completedAsPassenger } = await supabase
        .from('ride_requests')
        .select('rides!inner(*)', { count: 'exact', head: true })
        .eq('passenger_id', user?.id)
        .eq('status', 'accepted')
        .eq('rides.status', 'completed');

      console.log('Completed rides as passenger:', completedAsPassenger);

      // Get unique connections (people you've shared rides with)
      const { data: connectionsData } = await supabase
        .from('ride_requests')
        .select(`
          passenger_id,
          rides!inner(driver_id)
        `)
        .or(`passenger_id.eq.${user?.id},rides.driver_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      console.log('Connections data:', connectionsData);

      const uniqueConnections = new Set();
      connectionsData?.forEach(item => {
        if (item.passenger_id !== user?.id) {
          uniqueConnections.add(item.passenger_id);
        }
        if (item.rides.driver_id !== user?.id) {
          uniqueConnections.add(item.rides.driver_id);
        }
      });

      console.log('Unique connections:', uniqueConnections.size);

      // Get pending requests for user's rides
      const { count: pendingRequests } = await supabase
        .from('ride_requests')
        .select('rides!inner(*)', { count: 'exact', head: true })
        .eq('rides.driver_id', user?.id)
        .eq('status', 'pending');

      const newStats = {
        completedRides: (completedAsDriver || 0) + (completedAsPassenger || 0),
        connections: uniqueConnections.size,
        pendingRequests: pendingRequests || 0
      };

      console.log('New stats:', newStats);
      setStats(newStats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAvailableRides = async () => {
    setRidesLoading(true);
    try {
      // First, fetch rides without profiles
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gte('available_seats', 1)
        .neq('driver_id', user?.id) // Don't show user's own rides
        .order('departure_date', { ascending: true });

      if (ridesError) throw ridesError;

      if (!ridesData || ridesData.length === 0) {
        setAvailableRides([]);
        return;
      }

      // Get unique driver IDs
      const driverIds = [...new Set(ridesData.map(ride => ride.driver_id))];

      // Fetch driver profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, total_rating, rating_count')
        .in('user_id', driverIds);

      if (profilesError) throw profilesError;

      // Create a map for quick profile lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Combine rides with driver profiles
      const ridesWithProfiles = ridesData.map(ride => ({
        ...ride,
        driver_profile: profilesMap.get(ride.driver_id) || null
      }));

      setAvailableRides(ridesWithProfiles as Ride[]);
    } catch (error: any) {
      console.error('Error fetching available rides:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available rides',
        variant: 'destructive',
      });
    } finally {
      setRidesLoading(false);
    }
  };

  const handleRequestRide = async (rideId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ride_requests')
        .insert({
          ride_id: rideId,
          passenger_id: user.id,
          number_of_passengers: 1,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ride request sent successfully!',
      });

      // Refresh available rides
      fetchAvailableRides();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleEmergencyCall = () => {
    window.open('tel:911', '_self');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Car className="w-8 h-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-foreground">CarPool+</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome back, {profile?.username || 'Driver'}!
          </h2>
          <p className="text-muted-foreground">
            Ready to share a ride? Choose your role below.
          </p>
        </div>

        {/* Emergency SOS Button */}
        <div className="mb-8">
          <Button
            onClick={handleEmergencyCall}
            variant="destructive"
            size="lg"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
          >
            <Phone className="w-5 h-5 mr-2" />
            Emergency SOS
          </Button>
        </div>

        {/* User Stats */}
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your Stats</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats}
            disabled={loading}
          >
            Refresh Stats
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rating</p>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-2xl font-bold">
                      {profile?.total_rating ? profile.total_rating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {profile?.rating_count || 0} reviews
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Rides</p>
                  <p className="text-2xl font-bold">{stats.completedRides}</p>
                </div>
                <Car className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Connections</p>
                  <p className="text-2xl font-bold">{stats.connections}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
              {stats.pendingRequests > 0 && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {stats.pendingRequests} pending requests
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Driver Section */}
          <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="w-6 h-6 text-primary mr-2" />
                Be a Driver
              </CardTitle>
              <CardDescription>
                Share your car and earn money while helping others commute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="w-full" 
                  onClick={() => navigate('/create-ride')}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ride
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Clock className="w-4 h-4 mr-2" />
                      My Rides
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>My Rides</DialogTitle>
                    </DialogHeader>
                    <MyRides />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-medium mb-2">Benefits:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Earn money on your regular routes</li>
                  <li>• Reduce your travel costs</li>
                  <li>• Meet new people in your area</li>
                  <li>• Help reduce traffic and emissions</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Passenger Section */}
          <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-6 h-6 text-primary mr-2" />
                Be a Passenger
              </CardTitle>
              <CardDescription>
                Find affordable rides and connect with fellow commuters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="w-full"
                  onClick={fetchAvailableRides}
                  disabled={ridesLoading}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  {ridesLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Refresh Rides
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <MapPin className="w-4 h-4 mr-2" />
                      My Bookings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>My Bookings</DialogTitle>
                    </DialogHeader>
                    <MyBookings />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-medium mb-2">Benefits:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Save money on transportation</li>
                  <li>• More convenient than public transport</li>
                  <li>• Door-to-door service</li>
                  <li>• Travel with verified drivers</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Rides Section */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-foreground">
              Available Rides ({availableRides.length})
            </h3>
            <Button 
              variant="outline" 
              onClick={fetchAvailableRides}
              disabled={ridesLoading}
            >
              {ridesLoading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>

          {availableRides.length === 0 && !ridesLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No available rides at the moment</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back later or create your own ride
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableRides.map((ride) => (
              <Card key={ride.id} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Route Information */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-foreground">
                          <MapPin className="w-4 h-4 text-primary mr-1" />
                          <span className="font-medium text-sm">{ride.origin}</span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center text-foreground">
                          <MapPin className="w-4 h-4 text-primary mr-1" />
                          <span className="font-medium text-sm">{ride.destination}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                        Active
                      </Badge>
                    </div>

                    {ride.intermediate_stop && (
                      <div className="text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Stop: {ride.intermediate_stop}
                      </div>
                    )}

                    {/* Trip Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-primary mr-2" />
                        <span>{new Date(ride.departure_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-primary mr-2" />
                        <span>{ride.departure_time}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-primary mr-2" />
                        <span>{ride.available_seats} seats</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-primary mr-2" />
                        <span>₦{ride.price_per_seat}</span>
                      </div>
                    </div>

                    {ride.car_details && (
                      <div className="p-3 bg-secondary rounded-lg">
                        <div className="flex items-center text-sm">
                          <Car className="w-4 h-4 text-primary mr-2" />
                          <span>{ride.car_details}</span>
                        </div>
                      </div>
                    )}

                    {/* Driver Info */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-sm font-medium">{ride.driver_profile?.username || 'Unknown Driver'}</p>
                        {ride.driver_profile?.total_rating ? (
                          <div className="flex items-center text-xs">
                            <Star className="w-3 h-3 text-yellow-500 mr-1" />
                            <span>{ride.driver_profile.total_rating.toFixed(1)}</span>
                            <span className="text-muted-foreground ml-1">
                              ({ride.driver_profile.rating_count} reviews)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No ratings yet</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRequestRide(ride.id)}
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        Book Ride
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-12">
          <RecentActivity />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button 
            variant="outline" 
            onClick={() => {
              toast({
                title: 'Coming Soon',
                description: 'Messages feature will be available soon!',
              });
            }}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Messages
          </Button>
          <EditProfile />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
