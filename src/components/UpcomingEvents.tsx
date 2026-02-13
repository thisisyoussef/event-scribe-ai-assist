import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, ArrowRight, Clock3 } from "lucide-react";
import { Event } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { formatDateInMichigan, formatTimeInMichigan, toMichiganTime } from "@/utils/timezoneUtils";
import { createEventSlug, isEventToday, isEventTodayOrFuture } from "@/utils/eventUtils";
import { useNavigate } from "react-router-dom";

interface UpcomingEventsProps {
  onEventSelect?: (event: Event) => void;
}

const UpcomingEvents = ({ onEventSelect }: UpcomingEventsProps) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  const loadUpcomingEvents = async () => {
    try {
      // First get events with volunteer roles (exclude deleted events)
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*)
        `)
        .eq('status', 'published')
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('start_datetime', { ascending: true });

      if (error) {
        console.error('Error loading events:', error);
        return;
      }

      // Filter to upcoming events (today and future)
      const upcomingEvents = events?.filter(event => isEventTodayOrFuture(event)) || [];
      
      console.log('All events:', events);
      console.log('Upcoming events:', upcomingEvents);
      
      // Now get volunteer counts for each event
      const eventsWithVolunteers = await Promise.all(
        upcomingEvents.map(async (event) => {
          const { data: volunteers, error: volError } = await supabase
            .from('volunteers')
            .select('id, role_id')
            .eq('event_id', event.id)
            .eq('status', 'confirmed');
            
          if (volError) {
            console.error(`Error loading volunteers for ${event.title}:`, volError);
            return event;
          }
          
          // Group volunteers by role
          const volunteersByRole = volunteers?.reduce((acc, volunteer) => {
            const roleId = volunteer.role_id;
            if (!acc[roleId]) {
              acc[roleId] = [];
            }
            acc[roleId].push(volunteer);
            return acc;
          }, {} as Record<string, any[]>) || {};
          
          // Add volunteers to each role
          const updatedEvent = {
            ...event,
            volunteer_roles: event.volunteer_roles?.map(role => ({
              ...role,
              volunteers: volunteersByRole[role.id] || []
            }))
          };
          
          console.log(`Event: ${event.title}`);
          console.log('Total volunteers found:', volunteers?.length || 0);
          console.log('Volunteers by role:', volunteersByRole);
          
          return updatedEvent;
        })
      );

      setEvents(eventsWithVolunteers);
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
    const total = event.volunteer_roles?.reduce((sum, role) => {
      const volunteerCount = role.volunteers?.length || 0;
      console.log(`Role ${role.role_label}: ${volunteerCount} volunteers`);
      return sum + volunteerCount;
    }, 0) || 0;
    console.log(`Total volunteers for ${event.title}: ${total}`);
    return total;
  };

  const isEventToday = (event: Event) => {
    const eventDate = toMichiganTime(event.start_datetime);
    const today = toMichiganTime(new Date());
    return eventDate.toDateString() === today.toDateString();
  };

  const getEventDateInfo = (event: Event) => {
    const eventDate = toMichiganTime(event.start_datetime);
    const now = new Date();
    const fiveHoursFromNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const today = toMichiganTime(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if event is within 5 hours
    const isWithin5Hours = eventDate <= fiveHoursFromNow && eventDate > now;
    
    if (eventDate.toDateString() === today.toDateString()) {
      return { 
        label: "Today", 
        variant: "default" as const, 
        className: isWithin5Hours 
          ? "bg-white text-[#5c5b47] border-[#5c5b47] font-semibold" 
          : "bg-white text-[#5c5b47] border-[#5c5b47]",
        isUrgent: isWithin5Hours
      };
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      return { 
        label: "Tomorrow", 
        variant: "secondary" as const, 
        className: isWithin5Hours 
          ? "bg-white text-[#5c5b47] border-[#5c5b47] font-semibold" 
          : "bg-blue-100 text-blue-800 border-blue-200",
        isUrgent: isWithin5Hours
      };
    } else {
      return { 
        label: "Upcoming", 
        variant: "outline" as const, 
        className: isWithin5Hours 
          ? "bg-white text-[#5c5b47] border-[#5c5b47] font-semibold" 
          : "bg-gray-100 text-gray-800 border-gray-200",
        isUrgent: isWithin5Hours
      };
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5c5b47] mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading upcoming events...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Upcoming Events</h3>
        <p className="text-gray-600">There are no volunteer events scheduled at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Upcoming Volunteer Events</h2>
        <p className="text-sm sm:text-base text-gray-600">We are excited to have you as part of our volunteer network. Our stewards play a vital role in serving the community with trust, hospitality, and dedication.</p>
      </div>
      
      <div className="grid gap-3 sm:gap-4">
        {events.map((event) => {
          const totalSlots = getTotalSlots(event);
          const totalVolunteers = getTotalVolunteers(event);
          const remainingSlots = totalSlots - totalVolunteers;
          const dateInfo = getEventDateInfo(event);
          const isToday = isEventToday(event);
          const isUrgent = dateInfo.isUrgent;
          
          return (
            <Card 
              key={event.id} 
              onClick={() => handleEventClick(event)}
              className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-2 mx-2 sm:mx-0 ${
                isUrgent
                  ? 'border-[#5c5b47] bg-[#5c5b47] text-white hover:border-[#4b4a39] shadow-[#5c5b47]/30 shadow-lg'
                  : isToday 
                    ? 'border-[#5c5b47] hover:border-[#4b4a39] bg-[#5c5b47] text-white' 
                    : 'border-[#5c5b47]/20 hover:border-[#5c5b47]/40'
              }`}
            >
              <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className={`text-lg sm:text-xl ${isUrgent || isToday ? 'text-white font-bold' : 'text-gray-900'} break-words`}>
                        {event.title}
                      </CardTitle>
                      {isUrgent && <Clock3 className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current animate-pulse flex-shrink-0" />}
                    </div>
                    <div className={`flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm space-y-1 sm:space-y-0 sm:space-x-4 ${isUrgent || isToday ? 'text-white/80' : 'text-gray-600'}`}>
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
                  <Badge className={`${dateInfo.className} ${isUrgent ? 'ring-2 ring-white/40' : ''} self-start sm:self-auto`}>
                    {dateInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 px-4 sm:px-6">
                {event.description && (
                  <CardDescription className={`${isUrgent || isToday ? 'text-white/85' : 'text-gray-600'} mb-3 sm:mb-4 text-sm sm:text-base`}>
                    {event.description}
                  </CardDescription>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className={`flex items-center text-xs sm:text-sm ${isUrgent || isToday ? 'text-white/85' : 'text-gray-600'}`}>
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                    <span className={`${isUrgent || isToday ? 'text-white/90' : ''} break-words`}>
                      {totalVolunteers} of {totalSlots} volunteers signed up
                      {remainingSlots > 0 && (
                        <span className={`font-medium ${isUrgent || isToday ? 'text-white' : 'text-[#5c5b47]'}`}>
                          {isUrgent ? ` (${remainingSlots} spots remaining - Starting Soon!)` : ` (${remainingSlots} spots remaining)`}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    className={`w-full sm:w-auto ${
                      isUrgent
                        ? 'bg-white hover:bg-white/90 text-[#5c5b47] border border-white font-semibold shadow-lg'
                        : isToday 
                          ? 'bg-white hover:bg-white/90 text-[#5c5b47] border border-white font-semibold' 
                          : 'bg-[#5c5b47] hover:bg-[#7c7b55] text-white'
                    }`}
                  >
                    <span className="text-sm sm:text-base">
                      {isUrgent ? 'Starting Soon - Volunteer!' : isToday ? 'Volunteer Today' : 'Volunteer Now'}
                    </span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingEvents;
