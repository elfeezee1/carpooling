import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  Car,
  Star,
  MessageCircle
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
  profiles: {
    username: string;
    total_rating?: number;
    rating_count?: number;
  } | null;
}

const SearchRides = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    departure_date: '',
    passengers: 1
  });

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('rides')
        .select(`
          id,
          driver_id,
          origin,
          destination,
          intermediate_stop,
          departure_date,
          departure_time,
          available_seats,
          price_per_seat,
          car_details,
          status,
          profiles!rides_driver_id_fkey (
            username,
            total_rating,
            rating_count
          )
        `)
        .eq('status', 'active')
        .gte('available_seats', searchParams.passengers);

      if (searchParams.origin) {
        query = query.ilike('origin', `%${searchParams.origin}%`);
      }
      if (searchParams.destination) {
        query = query.ilike('destination', `%${searchParams.destination}%`);
      }
      if (searchParams.departure_date) {
        query = query.eq('departure_date', searchParams.departure_date);
      }

      const { data, error } = await query.order('departure_date', { ascending: true });

      if (error) throw error;
      setRides((data as unknown as Ride[]) || []);
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

  const handleRequestRide = async (rideId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ride_requests')
        .insert({
          ride_id: rideId,
          passenger_id: user.id,
          number_of_passengers: searchParams.passengers,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ride request sent successfully!',
      });

      // Refresh the rides to update available seats
      handleSearch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    // Load initial rides without filters
    handleSearch();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center">
              <Search className="w-8 h-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-foreground">Find Rides</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-6 h-6 text-primary mr-2" />
              Search for Rides
            </CardTitle>
            <CardDescription>
              Find available rides that match your travel plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="search_origin">From</Label>
                <Input
                  id="search_origin"
                  value={searchParams.origin}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, origin: e.target.value }))}
                  placeholder="Origin city"
                />
              </div>
              <div>
                <Label htmlFor="search_destination">To</Label>
                <Input
                  id="search_destination"
                  value={searchParams.destination}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, destination: e.target.value }))}
                  placeholder="Destination city"
                />
              </div>
              <div>
                <Label htmlFor="search_date">Date</Label>
                <Input
                  id="search_date"
                  type="date"
                  value={searchParams.departure_date}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, departure_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="search_passengers">Passengers</Label>
                <Input
                  id="search_passengers"
                  type="number"
                  min="1"
                  max="8"
                  value={searchParams.passengers}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, passengers: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full md:w-auto"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search Rides
            </Button>
          </CardContent>
        </Card>

        {/* Search Results */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Available Rides ({rides.length})
          </h2>

          {rides.length === 0 && !loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No rides found matching your criteria</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try adjusting your search parameters
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {rides.map((ride) => (
            <Card key={ride.id} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Route Information */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-foreground">
                          <MapPin className="w-4 h-4 text-primary mr-2" />
                          <span className="font-medium">{ride.origin}</span>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div className="flex items-center text-foreground">
                          <MapPin className="w-4 h-4 text-primary mr-2" />
                          <span className="font-medium">{ride.destination}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Active
                      </Badge>
                    </div>

                    {ride.intermediate_stop && (
                      <div className="mb-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>Stop: {ride.intermediate_stop}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                        <span>RM {ride.price_per_seat}</span>
                      </div>
                    </div>

                    {ride.car_details && (
                      <div className="mt-4 p-3 bg-secondary rounded-lg">
                        <div className="flex items-center text-sm">
                          <Car className="w-4 h-4 text-primary mr-2" />
                          <span>{ride.car_details}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver Info & Actions */}
                  <div className="border-l pl-6">
                    <div className="text-center mb-4">
                      <h4 className="font-medium text-foreground mb-2">Driver</h4>
                      <p className="text-sm text-muted-foreground mb-2">{ride.profiles?.username || 'Unknown Driver'}</p>
                      
                      {ride.profiles?.total_rating ? (
                        <div className="flex items-center justify-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          <span className="text-sm font-medium">
                            {ride.profiles.total_rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({ride.profiles.rating_count} reviews)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No ratings yet</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => handleRequestRide(ride.id)}
                        disabled={ride.driver_id === user?.id}
                        style={{ background: 'var(--gradient-primary)' }}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Request Ride
                      </Button>
                      
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Driver
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchRides;