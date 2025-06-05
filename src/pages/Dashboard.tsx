
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Users, Eye, Edit, Copy } from "lucide-react";
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

      // Type assert the data to match our expected types
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full mx-auto mb-6"></div>
              <p className="text-amber-700 font-medium text-lg">Loading your beautiful events...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 space-y-6 md:space-y-0">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent mb-2">
              Your Event Dashboard
            </h1>
            <p className="text-amber-700 text-lg leading-relaxed">
              Create meaningful moments that bring communities together
            </p>
          </div>
          <Button 
            onClick={() => navigate("/events/create")}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="w-5 h-5 mr-3" />
            Create Beautiful Event
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-amber-800">Total Events</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800 mb-1">{events.length}</div>
              <p className="text-amber-600 text-sm">Beautiful gatherings</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-amber-800">Active Events</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800 mb-1">
                {events.filter((event: Event) => event.status === "published").length}
              </div>
              <p className="text-amber-600 text-sm">Live & welcoming</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-amber-800">Community Members</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800 mb-1">
                {events.reduce((total: number, event: any) => total + (event.volunteers?.length || 0), 0)}
              </div>
              <p className="text-amber-600 text-sm">Hearts connected</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-amber-800">Open Opportunities</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800 mb-1">
                {events.reduce((total: number, event: any) => {
                  const stats = getEventStats(event);
                  return total + stats.openSlots;
                }, 0)}
              </div>
              <p className="text-amber-600 text-sm">Awaiting helpers</p>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card className="bg-white/90 backdrop-blur-sm border-amber-200 shadow-xl">
          <CardHeader className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white">
            <CardTitle className="text-2xl text-amber-800">Your Upcoming Events</CardTitle>
            <CardDescription className="text-amber-700 text-lg">
              Manage your beautiful gatherings and celebrate community participation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="text-center py-20 px-8">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-amber-800 mb-4">Your Event Journey Begins Here</h3>
                <p className="text-amber-600 mb-8 max-w-lg mx-auto leading-relaxed text-lg">
                  Create your first beautiful event and watch your community come together in meaningful ways
                </p>
                <Button 
                  onClick={() => navigate("/events/create")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  Create Your First Event
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-100 bg-amber-50/50">
                      <th className="text-left py-4 px-6 font-semibold text-amber-800">Event Details</th>
                      <th className="text-left py-4 px-6 font-semibold text-amber-800">When & Where</th>
                      <th className="text-left py-4 px-6 font-semibold text-amber-800">Community Response</th>
                      <th className="text-left py-4 px-6 font-semibold text-amber-800">Status</th>
                      <th className="text-left py-4 px-6 font-semibold text-amber-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event: any, index) => {
                      const stats = getEventStats(event);
                      return (
                        <tr key={event.id} className={`border-b border-amber-100 hover:bg-amber-50/30 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white/50' : 'bg-amber-50/20'}`}>
                          <td className="py-6 px-6">
                            <div>
                              <div className="font-semibold text-amber-800 text-lg mb-1">{event.title}</div>
                              <div className="text-amber-600 flex items-center">
                                <span className="text-sm">{event.location}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-6">
                            <div className="space-y-1">
                              <div className="text-amber-800 font-medium">
                                {new Date(event.start_datetime).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div className="text-amber-600 text-sm">
                                {new Date(event.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                {new Date(event.end_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-6">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="text-lg font-semibold text-amber-800">
                                  {stats.filledSlots} / {stats.totalSlots}
                                </div>
                                <span className="text-amber-600 text-sm">helpers joined</span>
                              </div>
                              <div className="w-full bg-amber-100 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${stats.totalSlots > 0 ? (stats.filledSlots / stats.totalSlots) * 100 : 0}%` }}
                                ></div>
                              </div>
                              {stats.openSlots > 0 && (
                                <div className="text-amber-600 text-sm">
                                  {stats.openSlots} spots awaiting kind hearts
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-6 px-6">
                            <Badge 
                              variant={event.status === "published" ? "default" : "secondary"}
                              className={event.status === "published" 
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-white border-none shadow-sm" 
                                : "bg-amber-100 text-amber-700 border-amber-200"
                              }
                            >
                              {event.status === "published" ? "Live & Welcoming" : "Preparing"}
                            </Badge>
                          </td>
                          <td className="py-6 px-6">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/events/${event.id}/roster`)}
                                title="View Community"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 rounded-xl"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/events/${event.id}/edit`)}
                                title="Edit Event"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 rounded-xl"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {event.status === "published" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copySignupLink(event.id)}
                                    title="Copy Invitation Link"
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 rounded-xl"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => openSignupLink(event.id)}
                                    title="Open Signup Page"
                                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                                  >
                                    Share
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
