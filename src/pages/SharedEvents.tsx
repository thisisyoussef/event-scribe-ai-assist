import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Calendar, MapPin, Users, Clock, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { displayTimeInMichigan } from "@/utils/timezoneUtils";
import { SharedEventAccess } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import { createEventSlug } from "@/utils/eventUtils";

const SharedEvents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [sharedEvents, setSharedEvents] = useState<SharedEventAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      await loadSharedEvents();
    };
    
    checkUser();
  }, [navigate]);

  const loadSharedEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        return;
      }

      console.log('Loading shared events for user:', user.id);

      // Use RPC to fetch shared events with metadata under definer rights
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_shared_events_with_meta');

      console.log('RPC result:', { rpcData, rpcError });

      if (rpcError) {
        console.error('Error loading shared events via RPC:', rpcError);
        toast({
          title: "Error",
          description: "Failed to load shared events.",
          variant: "destructive",
        });
        return;
      }

      const mapped: SharedEventAccess[] = (rpcData || []).map((row: any) => ({
        event: {
          id: row.id,
          title: row.title,
          description: row.description,
          location: row.location,
          start_datetime: row.start_datetime,
          end_datetime: row.end_datetime,
          sms_enabled: row.sms_enabled,
          day_before_time: row.day_before_time,
          day_of_time: row.day_of_time,
          status: row.status,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as any,
        permission_level: row.permission_level,
        shared_by: row.shared_by,
        shared_at: row.shared_at,
      }));

      console.log('Mapped RPC shared events:', mapped);

      setSharedEvents(mapped);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (level: 'view' | 'edit') => {
    return level === 'edit' ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />;
  };

  const getPermissionColor = (level: 'view' | 'edit') => {
    return level === 'edit' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateTimeString: string) => {
    return displayTimeInMichigan(dateTimeString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading shared events...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shared Events</h1>
          <p className="text-gray-600">
            Events that other users have shared with you
          </p>
        </div>

        {sharedEvents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Share2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shared Events</h3>
              <p className="text-gray-600 mb-4">
                You don't have any events shared with you yet.
              </p>
              <p className="text-sm text-gray-500">
                When someone shares an event with you, it will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sharedEvents.map((sharedEvent) => {
              // Skip rendering if event is null
              if (!sharedEvent.event) {
                console.warn('Skipping null event:', sharedEvent);
                return null;
              }
              
              return (
                <Card key={sharedEvent.event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{sharedEvent.event.title}</CardTitle>
                      <Badge className={getPermissionColor(sharedEvent.permission_level)}>
                        {getPermissionIcon(sharedEvent.permission_level)}
                        <span className="ml-1 capitalize">{sharedEvent.permission_level} Access</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(sharedEvent.event.start_datetime)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(sharedEvent.event.start_datetime)} - {formatTime(sharedEvent.event.end_datetime)}
                    </span>
                  </div>
                  
                  {sharedEvent.event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{sharedEvent.event.location}</span>
                    </div>
                  )}
                  
                  {sharedEvent.event.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {sharedEvent.event.description}
                    </p>
                  )}

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Shared {formatDate(sharedEvent.shared_at)}</span>
                      <span className="capitalize">{sharedEvent.event.status}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/${createEventSlug(sharedEvent.event.title, sharedEvent.event.id)}/checkin`)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    {sharedEvent.permission_level === 'edit' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/events/${sharedEvent.event.id}/edit`)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedEvents;
