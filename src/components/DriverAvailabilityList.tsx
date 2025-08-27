import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Users, MapPin, Star, Clock, Phone } from 'lucide-react';

interface DriverProfile {
  id: string;
  username: string;
  phone_number: string | null;
  avatar_url: string | null;
  total_rating: number | null;
  rating_count: number | null;
  availability_status: 'online' | 'offline' | 'busy';
  last_seen: string | null;
  active_rides_count?: number;
}

const DriverAvailabilityList = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDrivers = async () => {
    try {
      // Get all profiles who have created rides (drivers)
      const { data: driversData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          phone_number,
          avatar_url,
          total_rating,
          rating_count,
          availability_status,
          last_seen,
          user_id
        `)
        .in('user_id', 
          (await supabase
            .from('rides')
            .select('driver_id')
            .eq('status', 'active')
          ).data?.map(ride => ride.driver_id) || []
        );

      if (error) throw error;

      // Get active rides count for each driver
        const driversWithRideCount = await Promise.all(
          (driversData || []).map(async (driver) => {
            const { count } = await supabase
              .from('rides')
              .select('*', { count: 'exact', head: true })
              .eq('driver_id', driver.user_id)
              .eq('status', 'active');

            return {
              ...driver,
              availability_status: driver.availability_status as 'online' | 'offline' | 'busy',
              active_rides_count: count || 0
            };
          })
        );

      setDrivers(driversWithRideCount);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch drivers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailabilityStatus = async (status: 'online' | 'offline' | 'busy') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          availability_status: status,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `You are now ${status}`,
      });

      fetchDrivers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchDrivers();
    
    // Set up real-time subscription for driver updates
    const channel = supabase
      .channel('driver-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-100 text-green-800 border-green-300">Online</Badge>;
      case 'busy': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Busy</Badge>;
      case 'offline': return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Offline</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Driver Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Driver Availability ({drivers.length})
          </div>
          {user && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => updateAvailabilityStatus('online')}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                Go Online
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => updateAvailabilityStatus('busy')}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
              >
                Busy
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => updateAvailabilityStatus('offline')}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Offline
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {drivers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active drivers found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {drivers.map((driver) => (
              <div 
                key={driver.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={driver.avatar_url || undefined} />
                      <AvatarFallback>{driver.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div 
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(driver.availability_status)}`}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{driver.username}</h3>
                      {getStatusBadge(driver.availability_status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {driver.total_rating && driver.rating_count ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{driver.total_rating.toFixed(1)} ({driver.rating_count})</span>
                        </div>
                      ) : (
                        <span className="text-xs">No ratings yet</span>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{driver.active_rides_count} active rides</span>
                      </div>
                      
                      {driver.phone_number && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{driver.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatLastSeen(driver.last_seen)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverAvailabilityList;