import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Car, Users, MapPin, Shield, Star, ArrowRight } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

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
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-24 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-8">
            <Car className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-6">
            CarPool<span className="text-primary">+</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Share the ride, share the savings. Connect with others for 
            eco-friendly, cost-effective transportation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="px-8 py-4 text-lg"
              onClick={() => navigate('/auth')}
              style={{ background: 'var(--gradient-primary)' }}
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg"
              onClick={() => navigate('/auth')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Choose CarPool+?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make carpooling safe, convenient, and rewarding for everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-lg bg-card hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Find Partners</h3>
              <p className="text-muted-foreground">
                Connect with verified drivers and passengers in your area
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Real-time Tracking</h3>
              <p className="text-muted-foreground">
                Track your ride in real-time with live location updates
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Safety First</h3>
              <p className="text-muted-foreground">
                SOS button, identity verification, and safety ratings
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Rate & Review</h3>
              <p className="text-muted-foreground">
                Build trust through our comprehensive rating system
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Save Money, Help the Environment
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-success font-bold text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Reduce Travel Costs</h3>
                    <p className="text-muted-foreground">Split fuel costs and save up to 60% on your daily commute</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-success font-bold text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Reduce Carbon Footprint</h3>
                    <p className="text-muted-foreground">Help the environment by reducing the number of cars on the road</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-success font-bold text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Build Community</h3>
                    <p className="text-muted-foreground">Meet new people and build lasting connections in your area</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-card p-8 rounded-lg shadow-lg">
                <div className="text-4xl font-bold text-primary mb-2">60%</div>
                <div className="text-muted-foreground mb-4">Average savings on transportation costs</div>
                <div className="text-4xl font-bold text-success mb-2">75%</div>
                <div className="text-muted-foreground">Reduction in carbon emissions per trip</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            Ready to Start Sharing Rides?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who are already saving money and helping the environment
          </p>
          <Button 
            size="lg" 
            className="px-8 py-4 text-lg"
            onClick={() => navigate('/auth')}
            style={{ background: 'var(--gradient-primary)' }}
          >
            Join CarPool+ Today
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
