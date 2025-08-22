
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
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
  LogOut
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
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
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
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
                  <p className="text-2xl font-bold">0</p>
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
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
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
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'My Rides feature will be available soon!',
                    });
                  }}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  My Rides
                </Button>
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
                  onClick={() => navigate('/search-rides')}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Find Rides
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    toast({
                      title: 'Coming Soon',
                      description: 'My Bookings feature will be available soon!',
                    });
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  My Bookings
                </Button>
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

        {/* Recent Activity Section */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start by creating a ride or searching for available rides
                </p>
              </div>
            </CardContent>
          </Card>
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
          <Button 
            variant="outline" 
            onClick={() => {
              toast({
                title: 'Coming Soon',
                description: 'Profile editing will be available soon!',
              });
            }}
          >
            <Users className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
