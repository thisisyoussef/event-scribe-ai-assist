import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, ArrowRight } from "lucide-react";
import { Event } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { formatDateInMichigan, formatTimeInMichigan } from "@/utils/timezoneUtils";
import { createEventSlug, isEventToday } from "@/utils/eventUtils";
import { useNavigate } from "react-router-dom";

interface TodayEventsProps {
  onEventSelect?: (event: Event) => void;
}

const TodayEvents = ({ onEventSelect }: TodayEventsProps) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayEvents();
  }, []);

  const loadTodayEvents = async () => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*)
        `)
        .eq('status', 'published')
        .order('start_datetime', { ascending: true });

      if (error) {
        console.error('Error loading events:', error);
        return;
      }

      // Filter to only today's events using Michigan timezone
      const todayEvents = events?.filter(event => isEventToday(event)) || [];

      setEvents(todayEvents);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    const eventSlug = createEventSlug(event.title, event.id);
    navigate(`/${eventSlug}`);
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  const getTotalSlots = (event: Event) => {
    return event.volunteer_roles?.reduce((sum, role) => {
      return sum + (role.slots_brother || 0) + (role.slots_sister || 0) + (role.slots_flexible || 0);
    }, 0) || 0;
  };

  const getTotalVolunteers = (event: Event) => {
    return event.volunteer_roles?.reduce((sum, role) => {
      return sum + (role.volunteers?.length || 0);
    }, 0) || 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5c5b47] mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading today's events...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Today</h3>
        <p className="text-gray-600">There are no volunteer events scheduled for today.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center mb-4 sm:mb-6 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Today's Volunteer Events</h2>
        <p className="text-sm sm:text-base text-gray-600">Join us in serving the community today!</p>
      </div>
      
      {events.map((event) => {
        const totalSlots = getTotalSlots(event);
        const totalVolunteers = getTotalVolunteers(event);
        const remainingSlots = totalSlots - totalVolunteers;
        
        return (
          <Card 
            key={event.id} 
            onClick={() => handleEventClick(event)}
            className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 border-[#5c5b47]/20 hover:border-[#5c5b47]/40 mx-2 sm:mx-0"
          >
            <CardHeader className="pb-3 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl text-gray-900 mb-2 break-words">{event.title}</CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center text-gray-600 text-xs sm:text-sm space-y-1 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{formatDateInMichigan(event.start_datetime)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{formatTimeInMichigan(event.start_datetime)}</span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                      <span className="text-xs leading-tight break-words">{event.location}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-800 text-green-100 border-green-800 self-start sm:self-auto">
                  Today
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 px-4 sm:px-6">
              {event.description && (
                <CardDescription className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                  {event.description}
                </CardDescription>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span className="break-words">
                    {totalVolunteers} of {totalSlots} volunteers signed up
                    {remainingSlots > 0 && (
                      <span className="text-green-600 font-medium"> ({remainingSlots} spots remaining)</span>
                    )}
                  </span>
                </div>
                
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event);
                  }}
                  className="w-full sm:w-auto bg-[#5c5b47] hover:bg-[#7c7b55] text-white"
                >
                  <span className="text-sm sm:text-base">Volunteer Now</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TodayEvents;
