import { useState, useEffect } from 'react';
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
  Eye,
  Star,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: 'ride_created' | 'ride_requested' | 'ride_completed' | 'rating_given';
  title: string;
  description: string;
  date: string;
  status?: string;
  data?: any;
}

export const RecentActivity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    try {
      const activities: Activity[] = [];

      // Fetch rides created by user
      const { data: createdRides } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (createdRides) {
        createdRides.forEach(ride => {
          activities.push({
            id: `ride_${ride.id}`,
            type: 'ride_created',
            title: 'Ride Created',
            description: `${ride.origin} → ${ride.destination}`,
            date: ride.created_at,
            status: ride.status,
            data: ride
          });
        });
      }

      // Fetch ride requests by user
      const { data: rideRequests } = await supabase
        .from('ride_requests')
        .select(`
          *,
          rides (
            origin,
            destination,
            departure_date,
            departure_time
          )
        `)
        .eq('passenger_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (rideRequests) {
        rideRequests.forEach(request => {
          activities.push({
            id: `request_${request.id}`,
            type: 'ride_requested',
            title: 'Ride Requested',
            description: `${request.rides?.origin} → ${request.rides?.destination}`,
            date: request.created_at,
            status: request.status,
            data: request
          });
        });
      }

      // Fetch ratings given by user
      const { data: ratingsGiven } = await supabase
        .from('ratings')
        .select(`
          *,
          rides (
            origin,
            destination
          )
        `)
        .eq('rater_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (ratingsGiven) {
        ratingsGiven.forEach(rating => {
          activities.push({
            id: `rating_${rating.id}`,
            type: 'rating_given',
            title: 'Rating Given',
            description: `Rated ${rating.rating} stars for ${rating.rides?.origin} → ${rating.rides?.destination}`,
            date: rating.created_at,
            data: rating
          });
        });
      }

      // Sort all activities by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(activities.slice(0, 8)); // Show latest 8 activities
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load recent activity',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ride_created':
        return <Car className="w-4 h-4 text-green-500" />;
      case 'ride_requested':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'ride_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rating_given':
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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
      case 'accepted':
        return 'default';
      case 'pending':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start by creating a ride or searching for available rides
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <div className="flex items-center space-x-2">
                    {activity.status && (
                      <Badge variant={getStatusColor(activity.status)} className="text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.description}
                </p>
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(activity.date), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="w-4 h-4 mr-2" />
            View All Activity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};