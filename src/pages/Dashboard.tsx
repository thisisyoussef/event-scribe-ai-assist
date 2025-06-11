
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, Plus, Edit, Eye, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      loadEvents();
    };

    checkUser();
  }, [navigate]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      // With RLS policies in place, this query will automatically only return events created by the current user
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*)
        `)
        .order('start_datetime', { ascending: true });

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
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEventStatus = (event: any) => {
    const now = new Date();
    const startDate = new Date(event.start_datetime);
    const endDate = new Date(event.end_datetime);

    if (event.status === 'draft') {
      return { label: 'Draft', variant: 'secondary' as const };
    } else if (now < startDate) {
      return { label: 'Upcoming', variant: 'default' as const };
    } else if (now >= startDate && now <= endDate) {
      return { label: 'In Progress', variant: 'default' as const };
    } else {
      return { label: 'Completed', variant: 'secondary' as const };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTotalSlots = (volunteerRoles: any[]) => {
    return volunteerRoles?.reduce((total, role) => 
      total + (role.slots_brother || 0) + (role.slots_sister || 0), 0) || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-amber-800 mb-2">Event Dashboard</h1>
              <p className="text-amber-600">Manage your community events and volunteer coordination</p>
            </div>
            <Button 
              onClick={() => navigate("/events/new")}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Event
            </Button>
          </div>

          {/* Events Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-amber-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-amber-100 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-amber-50 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-amber-800 mb-2">No events yet</h3>
              <p className="text-amber-600 mb-6">Create your first community event to get started with volunteer coordination.</p>
              <Button 
                onClick={() => navigate("/events/new")}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Event
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event: any) => {
                const status = getEventStatus(event);
                const totalSlots = getTotalSlots(event.volunteer_roles);
                
                return (
                  <Card key={event.id} className="bg-white/90 backdrop-blur-sm border-amber-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-amber-800 text-lg">{event.title}</CardTitle>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                      <CardDescription className="text-amber-600">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.start_datetime)}</span>
                        </div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 text-amber-700">
                            <Users className="w-4 h-4" />
                            <span>{totalSlots} volunteer slots</span>
                          </div>
                          <div className="flex items-center space-x-2 text-amber-700">
                            <CheckCircle className="w-4 h-4" />
                            <span>{event.volunteer_roles?.length || 0} roles</span>
                          </div>
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-amber-600 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        <div className="flex space-x-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/events/${event.id}/edit`)}
                            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/events/${event.id}/roster`)}
                            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Roster
                          </Button>
                          {event.status === 'published' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/events/${event.id}`)}
                              className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Users className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
