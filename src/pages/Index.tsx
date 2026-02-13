
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Calendar, MessageSquare } from "lucide-react";
import UpcomingEvents from "@/components/UpcomingEvents";
import { Event } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { hasUpcomingEvents, isEventTodayOrFuture } from "@/utils/eventUtils";
import { toMichiganTime } from "@/utils/timezoneUtils";

const Index = () => {
  const navigate = useNavigate();
  const [hasEvents, setHasEvents] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // If user lands on home with hash tokens from Supabase, forward to callback preserving hash
    if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
      const hash = window.location.hash; // includes leading '#'
      // Preserve original tokens for the callback page
      window.location.replace(`/auth/callback${hash}`);
    }
    
    // Check if there are upcoming events
    checkForUpcomingEvents();
  }, []);

  // Auto-make events public 5 hours before start time
  const autoMakeEventsPublic = async () => {
    try {
      const now = new Date();
      const fiveHoursFromNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      
      // Get all published events that are currently private
      const { data: privateEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .eq('is_public', false);
        
      if (error) {
        console.error('Error fetching private events:', error);
        return;
      }
      
      if (!privateEvents || privateEvents.length === 0) {
        return; // No private events to check
      }
      
      // Find events that should be made public (within 5 hours)
      const eventsToMakePublic = privateEvents.filter(event => {
        const eventStart = new Date(event.start_datetime);
        return eventStart <= fiveHoursFromNow && eventStart > now;
      });
      
      if (eventsToMakePublic.length === 0) {
        return; // No events need to be made public
      }
      
      console.log(`🔄 Auto-making ${eventsToMakePublic.length} events public (5 hours before start)`);
      
      // Update each event to be public
      for (const event of eventsToMakePublic) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ 
            is_public: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);
          
        if (updateError) {
          console.error(`❌ Failed to make event ${event.title} public:`, updateError);
        } else {
          console.log(`✅ Made event "${event.title}" public (starts in ${Math.round((new Date(event.start_datetime).getTime() - now.getTime()) / (1000 * 60 * 60))} hours)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in autoMakeEventsPublic:', error);
    }
  };

  const checkForUpcomingEvents = async () => {
    try {
      // First, auto-make events public that are within 5 hours
      await autoMakeEventsPublic();
      
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .eq('is_public', true)
        .is('deleted_at', null);

      if (error) {
        console.error('Error loading events:', error);
        setHasEvents(false);
        return;
      }

      // Filter to upcoming events (today and future) using Michigan timezone
      const upcomingEvents = events?.filter(event => isEventTodayOrFuture(event)) || [];
      
      console.log('All events:', events);
      console.log('Upcoming events (Michigan timezone):', upcomingEvents);
      console.log('Current Michigan time:', toMichiganTime(new Date()));

      setHasEvents(upcomingEvents.length > 0);
    } catch (error) {
      console.error('Error:', error);
      setHasEvents(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${hasEvents ? 'bg-gradient-to-br from-gray-100 via-gray-150 to-gray-200' : ''}`}>
      {/* Header */}
      <header className={`border-b border-gray-200 ${hasEvents ? 'bg-white/90 backdrop-blur-sm' : 'bg-transparent absolute top-0 left-0 right-0 z-20'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  console.log('UMMA Stewards clicked, navigating to home');
                  navigate("/");
                }}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img 
                  src="/images/umma_stewards.png" 
                  alt="UMMA Stewards" 
                  className="h-12 w-auto object-contain rounded shadow-sm"
                />
              </button>
            </div>
            <Button 
              onClick={() => navigate("/login")} 
              className="bg-[#5c5b47] hover:bg-[#7c7b55] text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className={`w-full ${hasEvents ? 'min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8' : 'min-h-screen'}`}>
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5c5b47] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : hasEvents ? (
          // Show upcoming events
          <div className="max-w-4xl mx-auto">
            <UpcomingEvents />
          </div>
        ) : (
          // Show original landing page
          <>
            {/* Fixed background */}
            <div className="hero-bg"></div>
            
            {/* Content overlay */}
            <div className="relative z-10 min-h-screen flex items-center justify-center text-center">
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-gray-900/60"></div>
              
              <div className="max-w-4xl mx-auto relative z-10">
                <div className="mt-20 sm:mt-32 md:mt-40 lg:mt-48">
                  <p className="text-lg sm:text-xl text-white/95 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
                    We are excited to have you as part of our volunteer network. Our stewards play a vital role in serving the community with trust, hospitality, and dedication.
                  </p>
                  <div className="flex justify-center">
                    <Button 
                      size="lg" 
                      className="bg-[#5c5b47] hover:bg-[#7c7b55] text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={() => navigate("/login?mode=signup")}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Index;
