import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, MapPin, Calendar, Clock, Users, DollarSign } from 'lucide-react';

const CreateRide = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    intermediate_stop: '',
    departure_date: '',
    departure_time: '',
    available_seats: 1,
    price_per_seat: 0,
    car_details: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rides')
        .insert({
          driver_id: user.id,
          origin: formData.origin,
          destination: formData.destination,
          intermediate_stop: formData.intermediate_stop || null,
          departure_date: formData.departure_date,
          departure_time: formData.departure_time,
          available_seats: formData.available_seats,
          price_per_seat: formData.price_per_seat,
          car_details: formData.car_details || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ride created successfully!',
      });

      navigate('/dashboard');
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
              <Car className="w-8 h-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-foreground">Create New Ride</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Car className="w-6 h-6 text-primary mr-2" />
              Ride Details
            </CardTitle>
            <CardDescription>
              Fill in the details for your ride offer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Route Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Route Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin">From (Origin) *</Label>
                    <Input
                      id="origin"
                      value={formData.origin}
                      onChange={(e) => handleInputChange('origin', e.target.value)}
                      placeholder="Enter starting location"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="destination">To (Destination) *</Label>
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) => handleInputChange('destination', e.target.value)}
                      placeholder="Enter destination"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="intermediate_stop">Intermediate Stop (Optional)</Label>
                  <Input
                    id="intermediate_stop"
                    value={formData.intermediate_stop}
                    onChange={(e) => handleInputChange('intermediate_stop', e.target.value)}
                    placeholder="Add a stop along the route"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="departure_date">Departure Date *</Label>
                    <Input
                      id="departure_date"
                      type="date"
                      value={formData.departure_date}
                      onChange={(e) => handleInputChange('departure_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="departure_time">Departure Time *</Label>
                    <Input
                      id="departure_time"
                      type="time"
                      value={formData.departure_time}
                      onChange={(e) => handleInputChange('departure_time', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Passenger & Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Passenger & Pricing Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="available_seats">Available Seats *</Label>
                    <Input
                      id="available_seats"
                      type="number"
                      min="1"
                      max="8"
                      value={formData.available_seats}
                      onChange={(e) => handleInputChange('available_seats', parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price_per_seat">Price per Seat (RM) *</Label>
                    <Input
                      id="price_per_seat"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_per_seat}
                      onChange={(e) => handleInputChange('price_per_seat', parseFloat(e.target.value))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Car Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle Information
                </h3>
                
                <div>
                  <Label htmlFor="car_details">Car Details (Optional)</Label>
                  <Textarea
                    id="car_details"
                    value={formData.car_details}
                    onChange={(e) => handleInputChange('car_details', e.target.value)}
                    placeholder="e.g., Honda Civic, White, ABC 1234"
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'Creating Ride...' : 'Create Ride Offer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateRide;