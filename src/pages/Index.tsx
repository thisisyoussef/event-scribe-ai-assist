
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UpcomingEvents from "@/components/UpcomingEvents";
import { supabase } from "@/integrations/supabase/client";
import { isEventTodayOrFuture } from "@/utils/eventUtils";
import { toMichiganTime } from "@/utils/timezoneUtils";

const Index = () => {
  const navigate = useNavigate();
  const [hasEvents, setHasEvents] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If user lands on home with hash tokens from Supabase, forward to callback preserving hash
    if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
      const hash = window.location.hash;
      window.location.replace(`/auth/callback${hash}`);
    }

    checkForUpcomingEvents();
  }, []);

  // Auto-make events public 5 hours before start time
  const autoMakeEventsPublic = async () => {
    try {
      const now = new Date();
      const fiveHoursFromNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);

      const { data: privateEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .eq('is_public', false);

      if (error || !privateEvents || privateEvents.length === 0) return;

      const eventsToMakePublic = privateEvents.filter(event => {
        const eventStart = new Date(event.start_datetime);
        return eventStart <= fiveHoursFromNow && eventStart > now;
      });

      if (eventsToMakePublic.length === 0) return;

      for (const event of eventsToMakePublic) {
        await supabase
          .from('events')
          .update({
            is_public: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Error in autoMakeEventsPublic:', error);
    }
  };

  const checkForUpcomingEvents = async () => {
    try {
      await autoMakeEventsPublic();

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .eq('is_public', true)
        .is('deleted_at', null);

      if (error) {
        setHasEvents(false);
        return;
      }

      const upcomingEvents = events?.filter(event => isEventTodayOrFuture(event)) || [];
      setHasEvents(upcomingEvents.length > 0);
    } catch (error) {
      setHasEvents(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="border-b border-gold-400/10 bg-navy-800/60 backdrop-blur-xl absolute top-0 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/")}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="crescent-moon mr-1" />
                <span className="text-lg font-semibold text-gold-300 tracking-wide">UMMA Stewards</span>
              </button>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="bg-gold-400 hover:bg-gold-300 text-navy-900 font-medium rounded-lg shadow-lg button-glow transition-all duration-200"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className={`w-full ${hasEvents ? 'min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8 pt-24' : 'min-h-screen'}`}>
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="crescent-moon-lg mx-auto mb-4 animate-pulse-soft" />
              <p className="text-white/50">Loading...</p>
            </div>
          </div>
        ) : hasEvents ? (
          <div className="max-w-4xl mx-auto">
            <UpcomingEvents />
          </div>
        ) : (
          <>
            {/* Night sky landing with hero content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center text-center">
              {/* Decorative geometric pattern overlay */}
              <div className="absolute inset-0 geometric-accent opacity-30" />

              <div className="max-w-4xl mx-auto relative z-10 px-4">
                <div className="mt-20 sm:mt-32 md:mt-40 lg:mt-48">
                  {/* Crescent + Stars decorative element */}
                  <div className="flex items-center justify-center space-x-4 mb-8">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400/40" />
                    <div className="crescent-moon-lg animate-float" />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400/40" />
                  </div>

                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold gradient-text mb-6">
                    Ramadan Mubarak
                  </h1>

                  <p className="text-lg sm:text-xl text-white/70 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
                    We are excited to have you as part of our volunteer network. Our stewards play a vital role in serving the community with trust, hospitality, and dedication.
                  </p>

                  {/* Decorative divider */}
                  <div className="ramadan-divider max-w-xs mx-auto mb-8" />

                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      className="bg-gold-400 hover:bg-gold-300 text-navy-900 px-8 py-4 text-lg rounded-xl shadow-xl button-glow transition-all duration-300 font-semibold"
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
