
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Users, Eye, Edit, MoreHorizontal, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event, VolunteerRole, Volunteer } from "@/types/database";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
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

      setEvents(eventsData || []);
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

  const copySignupLink = (eventId: string) => {
    const link = `${window.location.origin}/event/${eventId}/signup`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Volunteer sign-up link copied to clipboard.",
    });
  };

  const openSignupLink = (eventId: string) => {
    const link = `/event/${eventId}/signup`;
    window.open(link, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading events...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Dashboard</h1>
            <div className="text-gray-600 mt-1">Manage your events and volunteer coordination</div>
          </div>
          <Button 
            onClick={() => navigate("/events/create")}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Event
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter((event: Event) => event.status === "published").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.reduce((total: number, event: any) => total + (event.volunteers?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Slots</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.reduce((total: number, event: any) => {
                  const stats = getEventStats(event);
                  return total + stats.openSlots;
                }, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>
              Manage your events and track volunteer participation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
                <div className="text-gray-500 mb-4">Get started by creating your first event</div>
                <Button 
                  onClick={() => navigate("/events/create")}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Event</th>
                      <th className="text-left py-3 px-4 font-medium">Date/Time</th>
                      <th className="text-left py-3 px-4 font-medium">Volunteers</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event: any) => {
                      const stats = getEventStats(event);
                      return (
                        <tr key={event.id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{event.title}</div>
                              <div className="text-sm text-gray-500">{event.location}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              {new Date(event.start_datetime).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(event.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                              {new Date(event.end_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              {stats.filledSlots} / {stats.totalSlots} filled
                            </div>
                            <div className="text-sm text-gray-500">
                              {stats.openSlots} open slots
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              variant={event.status === "published" ? "default" : "secondary"}
                            >
                              {event.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/events/${event.id}/roster`)}
                                title="View Roster"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/events/${event.id}/edit`)}
                                title="Edit Event"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {event.status === "published" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copySignupLink(event.id)}
                                    title="Copy Signup Link"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openSignupLink(event.id)}
                                    title="Open Signup Page"
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Open
                                  </Button>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
