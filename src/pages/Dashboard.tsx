import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Users, Eye, Edit, Copy, Phone, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { displayTimeInMichigan } from "@/utils/timezoneUtils";
import { Event, VolunteerRole, Volunteer } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import EventSharingDialog from "@/components/event-creation/EventSharingDialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Function to create URL-friendly slug from event title
  const createEventSlug = (title: string, id: string) => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    
    // Add last 4 characters of ID to handle duplicates
    const uniqueSuffix = id.slice(-4);
    return `${baseSlug}-${uniqueSuffix}`;
  };

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      await loadEvents();
    };
    
    checkUser();
  }, [navigate]);

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
        toast({
          title: "Error",
          description: "Failed to load events.",
          variant: "destructive",
        });
        return;
      }

      setEvents((eventsData || []) as Event[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventStats = (event: Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] }) => {
    const totalSlots = event.volunteer_roles?.reduce((sum: number, role: VolunteerRole) => 
      sum + (role.slots_brother || 0) + (role.slots_sister || 0), 0) || 0;
    
    const filledSlots = event.volunteers?.length || 0;
    
    return {
      totalSlots,
      filledSlots,
      openSlots: totalSlots - filledSlots
    };
  };

  const getFilteredEvents = () => {
    switch (eventFilter) {
      case 'published':
        return events.filter((event: Event) => event.status === 'published');
      case 'draft':
        return events.filter((event: Event) => event.status === 'draft');
      default:
        return events;
    }
  };

  const copySignupLink = (event: Event) => {
    const eventSlug = createEventSlug(event.title, event.id);
    const link = `${window.location.origin}/${eventSlug}/volunteer`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Volunteer sign-up link copied to clipboard.",
    });
  };

  const openSignupLink = (event: Event) => {
    const eventSlug = createEventSlug(event.title, event.id);
    const link = `/${eventSlug}/volunteer`;
    window.open(link, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-3 border-umma-400 border-t-transparent rounded-full mx-auto mb-6"></div>
              <p className="text-umma-700 font-medium text-lg">Loading your events...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-12 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-umma-800 mb-2">
              Event Dashboard
            </h1>
            <p className="text-umma-700 text-base md:text-lg leading-relaxed">
              Organize events and manage volunteer coordination
            </p>
          </div>
          <Button 
            onClick={() => navigate("/events/create")}
            className="w-full lg:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="w-4 md:w-5 h-4 md:h-5 mr-2 md:mr-3" />
            Create Event
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-12">
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Total Events</CardTitle>
              <div className="w-8 md:w-12 h-8 md:h-12 bg-primary rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="h-4 md:h-6 w-4 md:w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 md:pb-4">
              <div className="text-xl md:text-3xl font-bold mb-1">{events.length}</div>
              <p className="text-muted-foreground text-xs md:text-sm">Events created</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Active Events</CardTitle>
              <div className="w-8 md:w-12 h-8 md:h-12 bg-green-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="h-4 md:h-6 w-4 md:w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 md:pb-4">
              <div className="text-xl md:text-3xl font-bold mb-1">
                {events.filter((event: Event) => event.status === "published").length}
              </div>
              <p className="text-muted-foreground text-xs md:text-sm">Published</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Draft Events</CardTitle>
              <div className="w-8 md:w-12 h-8 md:h-12 bg-yellow-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="h-4 md:h-6 w-4 md:w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 md:pb-4">
              <div className="text-xl md:text-3xl font-bold mb-1">
                {events.filter((event: Event) => event.status === "draft").length}
              </div>
              <p className="text-muted-foreground text-xs md:text-sm">Draft</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Volunteers</CardTitle>
              <div className="w-8 md:w-12 h-8 md:h-12 bg-primary rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-4 md:h-6 w-4 md:w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 md:pb-4">
              <div className="text-xl md:text-3xl font-bold mb-1">
                {events.reduce((total: number, event: any) => total + (event.volunteers?.length || 0), 0)}
              </div>
              <p className="text-muted-foreground text-xs md:text-sm">Signed up</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Open Spots</CardTitle>
              <div className="w-8 md:w-12 h-8 md:h-12 bg-primary rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-4 md:h-6 w-4 md:w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 md:pb-4">
              <div className="text-xl md:text-3xl font-bold text-umma-800 mb-1">
                {events.reduce((total: number, event: any) => {
                  const stats = getEventStats(event);
                  return total + stats.openSlots;
                }, 0)}
              </div>
              <p className="text-umma-600 text-xs md:text-sm">Available</p>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card className="shadow-xl">
          <CardHeader className={`border-b border-umma-100 bg-umma-50 ${isMobile ? 'p-4' : ''}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl md:text-2xl text-umma-800">Your Events</CardTitle>
                <CardDescription className="text-umma-700 text-base md:text-lg">
                  Manage your events and track volunteer participation
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={eventFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEventFilter('all')}
                  className="text-xs"
                >
                  All ({events.length})
                </Button>
                <Button
                  variant={eventFilter === 'published' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEventFilter('published')}
                  className="text-xs"
                >
                  Published ({events.filter((event: Event) => event.status === "published").length})
                </Button>
                <Button
                  variant={eventFilter === 'draft' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEventFilter('draft')}
                  className="text-xs"
                >
                  Drafts ({events.filter((event: Event) => event.status === "draft").length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-3' : 'p-0'}`}>
            {getFilteredEvents().length === 0 ? (
              <div className="text-center py-12 md:py-20 px-4 md:px-8">
                <div className="w-16 md:w-20 h-16 md:h-20 bg-primary rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
                  <Calendar className="w-8 md:w-10 h-8 md:h-10 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Start Organizing Events</h3>
                <p className="text-muted-foreground mb-6 md:mb-8 max-w-lg mx-auto leading-relaxed text-base md:text-lg">
                  Create your first event and start coordinating volunteers
                </p>
                <Button 
                  onClick={() => navigate("/events/create")}
                  className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="w-4 md:w-5 h-4 md:h-5 mr-2 md:mr-3" />
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <>
                {isMobile ? (
                  <div className="space-y-3">
                    {getFilteredEvents().map((event: any) => {
                      const stats = getEventStats(event);
                      return (
                        <div key={event.id} className="bg-umma-50 rounded-lg p-3 border border-umma-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-umma-800 text-sm mb-1">{event.title}</h3>
                              <p className="text-umma-600 text-xs mb-1">{event.location}</p>
                              <p className="text-umma-600 text-xs">
                                {new Date(event.start_datetime).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                            <Badge 
                              variant={event.status === "published" ? "default" : "secondary"}
                              className={`text-xs ${event.status === "published" 
                                ? "bg-green-500 text-white border-none shadow-sm" 
                                : "bg-umma-100 text-umma-700 border-umma-200"
                              }`}
                            >
                              {event.status === "published" ? "Live" : "Draft"}
                            </Badge>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-umma-600">Volunteers</span>
                              <span className="text-sm font-semibold text-umma-800">
                                {stats.filledSlots} / {stats.totalSlots}
                              </span>
                            </div>
                            <div className="w-full bg-umma-100 rounded-full h-2">
                              <div 
                                className="bg-umma-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${stats.totalSlots > 0 ? (stats.filledSlots / stats.totalSlots) * 100 : 0}%` }}
                              ></div>
                            </div>
                            {stats.openSlots > 0 && (
                              <div className="text-umma-600 text-xs mt-1">
                                {stats.openSlots} open spots
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/events/${event.id}/roster`)}
                              className="flex-1 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/events/${event.id}/edit`)}
                              className="flex-1 text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            {event.status === "published" && (
                              <EventSharingDialog
                                eventId={event.id}
                                eventTitle={event.title}
                                trigger={
                                  <Button
                                    size="sm"
                                    className="flex-1 text-xs"
                                  >
                                    <Share2 className="w-3 h-3 mr-1" />
                                    Share
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="border-b border-umma-100 bg-umma-50/50">
                          <th className="text-left py-3 md:py-4 px-3 md:px-6 font-semibold text-umma-800 text-sm md:text-base">Event</th>
                          <th className="text-left py-3 md:py-4 px-3 md:px-6 font-semibold text-umma-800 text-sm md:text-base hidden md:table-cell">Date & Time</th>
                          <th className="text-left py-3 md:py-4 px-3 md:px-6 font-semibold text-umma-800 text-sm md:text-base">Volunteers</th>
                          <th className="text-left py-3 md:py-4 px-3 md:px-6 font-semibold text-umma-800 text-sm md:text-base">Status</th>
                          <th className="text-left py-3 md:py-4 px-3 md:px-6 font-semibold text-umma-800 text-sm md:text-base">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredEvents().map((event: any, index) => {
                          const stats = getEventStats(event);
                          return (
                            <tr key={event.id} className={`border-b border-umma-100 hover:bg-umma-50/30 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white/50' : 'bg-umma-50/20'}`}>
                              <td className="py-4 md:py-6 px-3 md:px-6">
                                <div>
                                  <div className="font-semibold text-umma-800 text-sm md:text-lg mb-1">{event.title}</div>
                                  <div className="text-umma-600 text-xs md:text-sm">{event.location}</div>
                                  <div className="md:hidden text-umma-600 text-xs mt-1">
                                    {new Date(event.start_datetime).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 md:py-6 px-3 md:px-6 hidden md:table-cell">
                                <div className="space-y-1">
                                  <div className="text-umma-800 font-medium text-sm">
                                    {new Date(event.start_datetime).toLocaleDateString('en-US', { 
                                      weekday: 'short', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                  <div className="text-umma-600 text-xs">
                                    {displayTimeInMichigan(event.start_datetime)}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 md:py-6 px-3 md:px-6">
                                <div className="space-y-1 md:space-y-2">
                                  <div className="flex items-center space-x-1 md:space-x-2">
                                    <div className="text-sm md:text-lg font-semibold text-umma-800">
                                      {stats.filledSlots} / {stats.totalSlots}
                                    </div>
                                  </div>
                                  <div className="w-full bg-umma-100 rounded-full h-1.5 md:h-2">
                                    <div 
                                      className="bg-umma-500 h-1.5 md:h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${stats.totalSlots > 0 ? (stats.filledSlots / stats.totalSlots) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                  {stats.openSlots > 0 && (
                                    <div className="text-umma-600 text-xs">
                                      {stats.openSlots} open
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 md:py-6 px-3 md:px-6">
                                <Badge 
                                  variant={event.status === "published" ? "default" : "secondary"}
                                  className={`text-xs ${event.status === "published" 
                                    ? "bg-green-500 text-white border-none shadow-sm" 
                                    : "bg-umma-100 text-umma-700 border-umma-200"
                                  }`}
                                >
                                  {event.status === "published" ? "Live" : "Draft"}
                                </Badge>
                              </td>
                              <td className="py-4 md:py-6 px-3 md:px-6">
                                <div className="flex space-x-1 md:space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/events/${event.id}/roster`)}
                                    title="View Roster"
                                    className="rounded-lg md:rounded-xl p-1 md:p-2"
                                  >
                                    <Eye className="w-3 md:w-4 h-3 md:h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(`/events/${event.id}/edit`)}
                                    title="Edit Event"
                                    className="rounded-lg md:rounded-xl p-1 md:p-2"
                                  >
                                    <Edit className="w-3 md:w-4 h-3 md:h-4" />
                                  </Button>
                                  {event.status === "published" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copySignupLink(event)}
                                        title="Copy Link"
                                        className="hidden md:flex rounded-xl"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                      <EventSharingDialog
                                        eventId={event.id}
                                        eventTitle={event.title}
                                        trigger={
                                          <Button
                                            size="sm"
                                            title="Share Event"
                                            className="rounded-lg md:rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs md:text-sm px-2 md:px-3"
                                          >
                                            <Share2 className="w-4 h-4 mr-1" />
                                            Share
                                          </Button>
                                        }
                                      />
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
