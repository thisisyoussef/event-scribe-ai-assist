import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Users, Eye, Edit, Copy, Phone, Trash2, Search, TrendingUp, FileText, Globe, UserCheck, ArrowUpRight, Crown, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { displayTimeInMichigan } from "@/utils/timezoneUtils";
import { Event, VolunteerRole, Volunteer } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
// Sharing disabled when all events are visible
import { useEventDeletion } from "@/hooks/useEventDeletion";
import { useAdminStatus } from "@/hooks/useAdminStatus";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { softDeleteEvent, isDeleting } = useEventDeletion();
  const { isAdmin } = useAdminStatus();
  const [events, setEvents] = useState<Event[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  
  // Check if user can edit events (admin or event creator)
  const hasEditPermission = (event: any) => {
    return isAdmin || event.created_by === currentUser?.id;
  };
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [displayMode, setDisplayMode] = useState<Record<string, 'name' | 'email'>>({});
  const [eventFilter, setEventFilter] = useState<'all' | 'published' | 'draft' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    event: Event | null;
  }>({ isOpen: false, event: null });
  // Sharing dialog removed

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

  // Function to create a readable slug from event title
  const createReadableEventSlug = (title: string, id: string) => {
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
      try {
        // Clear any cached session data first
        console.log('🔄 Checking user session...');
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ Error getting user:', userError);
          if ((userError as any).status === 406) {
            console.error('🔍 406 error on auth check - clearing session');
            await supabase.auth.signOut();
            navigate("/login");
            return;
          }
        }
        
        if (!user) {
          console.log('No user found, redirecting to login');
          navigate("/login");
          return;
        }
        
        console.log('✅ User authenticated:', user.id);
        setCurrentUser(user);
        await loadEvents();
      } catch (error) {
        console.error('❌ Error in checkUser:', error);
        navigate("/login");
      }
    };
    
    checkUser();
  }, [navigate]);

  // Auto-make events public 5 hours before start time
  const autoMakeEventsPublic = async (events: Event[]) => {
    try {
      const now = new Date();
      const fiveHoursFromNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      
      // Find events that should be made public
      const eventsToMakePublic = events.filter(event => {
        if (event.status !== 'published' || event.is_public === true) {
          return false; // Skip if not published or already public
        }
        
        const eventStart = new Date(event.start_datetime);
        return eventStart <= fiveHoursFromNow && eventStart > now;
      });
      
      if (eventsToMakePublic.length === 0) {
        return; // No events need to be made public
      }
      
      console.log(`🔄 Auto-making ${eventsToMakePublic.length} events public (5 hours before start)`);
      
      // Update each event to be public
      for (const event of eventsToMakePublic) {
        const { error } = await supabase
          .from('events')
          .update({ 
            is_public: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);
          
        if (error) {
          console.error(`❌ Failed to make event ${event.title} public:`, error);
        } else {
          console.log(`✅ Made event "${event.title}" public (starts in ${Math.round((new Date(event.start_datetime).getTime() - now.getTime()) / (1000 * 60 * 60))} hours)`);
          // Update the local event data
          event.is_public = true;
        }
      }
      
      if (eventsToMakePublic.length > 0) {
        toast({
          title: "Events Auto-Made Public",
          description: `${eventsToMakePublic.length} event(s) were automatically made public as they start within 5 hours.`,
        });
      }
      
    } catch (error) {
      console.error('❌ Error in autoMakeEventsPublic:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        navigate("/login");
        return;
      }

      console.log('🔄 Loading events for user:', user.id);

      // First try a simple query to test connectivity
      console.log('🧪 Testing simple events query...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('events')
        .select('id, title')
        .is('deleted_at', null)
        .limit(5);

      if (simpleError) {
        console.error('❌ Simple query failed:', simpleError);
        if ((simpleError as any).status === 406) {
          console.error('🔍 406 Not Acceptable error detected');
          console.error('Error details:', {
            message: simpleError.message,
            code: simpleError.code,
            details: simpleError.details,
            hint: simpleError.hint,
            status: (simpleError as any).status,
            statusText: (simpleError as any).statusText
          });
        }
        toast({
          title: "Connection Error",
          description: `Failed to load events: ${simpleError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Simple query successful, found', simpleData?.length || 0, 'events');

      // Now try the complex query
      console.log('🧪 Testing complex events query with nested selects...');
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Complex query failed:', error);
        if ((error as any).status === 406) {
          console.error('🔍 406 Not Acceptable error on complex query');
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: (error as any).status,
            statusText: (error as any).statusText
          });
          
          // Fallback to simple query if complex query fails
          console.log('🔄 Falling back to simple query...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('events')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

          if (fallbackError) {
            console.error('❌ Fallback query also failed:', fallbackError);
            toast({
              title: "Error",
              description: "Failed to load events. Please refresh the page.",
              variant: "destructive",
            });
            return;
          }

          console.log('✅ Fallback query successful');
          setEvents(fallbackData as Event[]);
          await fetchCreatorNames(fallbackData as Event[]);
          return;
        }

        toast({
          title: "Error",
          description: "Failed to load events.",
          variant: "destructive",
        });
        return;
      }

      // Filter out any soft-deleted events as a backup (in case RLS doesn't work)
      const filteredEvents = (eventsData || []).filter((event: any) => !event.deleted_at);
      console.log('✅ Complex query successful - Loaded events:', eventsData?.length || 0, 'Filtered events:', filteredEvents.length);
      
      // Auto-make events public 5 hours before start time
      await autoMakeEventsPublic(filteredEvents);
      
      setEvents(filteredEvents as Event[]);

      // Fetch creator names for display (for admin visibility)
      await fetchCreatorNames(filteredEvents as Event[]);

    } catch (error) {
      console.error('❌ Unexpected error in loadEvents:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while loading events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatorNames = async (eventsList: Pick<Event, 'created_by'>[]) => {
    try {
      const uniqueCreatorIds = Array.from(new Set((eventsList || [])
        .map((e: any) => e.created_by)
        .filter((id: string | undefined): id is string => Boolean(id))));

      if (uniqueCreatorIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueCreatorIds);

      if (error) {
        console.error('Error fetching creator profiles:', error);
        return;
      }

      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        map[p.id] = p.full_name || p.email || 'Unknown';
      });
      setCreatorNames(map);
    } catch (err) {
      console.error('Unexpected error fetching creator names:', err);
    }
  };

  const getEventStats = (event: Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] }) => {
    const totalSlots = event.volunteer_roles?.reduce((sum: number, role: VolunteerRole) =>
      sum + (role.slots_brother || 0) + (role.slots_sister || 0) + (role.slots_flexible || 0), 0) || 0;
    
    const filledSlots = event.volunteers?.length || 0;
    
    return {
      totalSlots,
      filledSlots,
      openSlots: totalSlots - filledSlots
    };
  };

  const isPastEvent = (event: Event) => {
    const eventDate = new Date(event.start_datetime);
    const today = new Date();
    // Set today to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  const getEventStatus = (event: Event) => {
    if (isPastEvent(event)) {
      return 'past';
    }
    return event.status as 'published' | 'draft';
  };

  const toggleDisplayMode = (eventId: string) => {
    setDisplayMode(prev => ({
      ...prev,
      [eventId]: (prev[eventId] || 'name') === 'name' ? 'email' : 'name'
    }));
  };

  const getDisplayMode = (eventId: string) => {
    return displayMode[eventId] || 'name'; // Default to showing names
  };

  const clearCacheAndRefresh = async () => {
    try {
      console.log('🧹 Clearing cache and refreshing...');
      
      // Clear any cached data
      setEvents([]);
      setCreatorNames({});
      
      // Clear Supabase session cache
      await supabase.auth.refreshSession();
      
      // Wait a moment for the refresh to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload events
      setLoading(true);
      await loadEvents();
      
      console.log('✅ Cache cleared and refreshed');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  };

  const getFilteredEvents = () => {
    let filtered = events;
    
    // Apply status filter
    switch (eventFilter) {
      case 'published':
        filtered = filtered.filter((event: Event) => getEventStatus(event) === 'published');
        break;
      case 'draft':
        filtered = filtered.filter((event: Event) => getEventStatus(event) === 'draft');
        break;
      case 'past':
        filtered = filtered.filter((event: Event) => isPastEvent(event));
        break;
      default:
        break;
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((event: Event) => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const copySignupLink = (event: Event) => {
    const eventSlug = createReadableEventSlug(event.title, event.id);
    const link = `${window.location.origin}/${eventSlug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Volunteer sign-up link copied to clipboard.",
    });
  };

  const openSignupLink = (event: Event) => {
    const eventSlug = createReadableEventSlug(event.title, event.id);
    const link = `/${eventSlug}`;
    window.open(link, '_blank');
  };

  const handleDeleteEvent = async (event: Event) => {
    const success = await softDeleteEvent(event.id, event.title);
    if (success) {
      // Remove from local state
      setEvents(prev => prev.filter(e => e.id !== event.id));
      setDeleteDialog({ isOpen: false, event: null });
    }
  };

  const clearFilters = () => {
    setEventFilter('all');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-3 border-[#5c5b2f] border-t-transparent rounded-full mx-auto mb-6"></div>
              <p className="text-gray-700 font-medium text-lg">Loading your events...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                  Event Dashboard
                </h1>
                {isAdmin && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 p-1.5 md:p-2">
                    <Crown className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                    <span className="hidden md:inline">Admin Mode</span>
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                Organize events and manage volunteer coordination
              </p>
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                onClick={() => navigate("/events/create")}
                className="w-full h-10 px-4 sm:px-6 bg-[#5c5b2f] hover:bg-[#4a4a28] text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
              <Button 
                onClick={() => navigate("/recently-deleted")}
                variant="ghost"
                className="hidden sm:flex h-10 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Recently Deleted
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 max-w-5xl mx-auto">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="p-2 bg-[#5c5b2f]/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#5c5b2f]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                  <p className="text-sm text-gray-600">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {events.filter((event: Event) => getEventStatus(event) === "published").length}
                  </p>
                  <p className="text-sm text-gray-600">Active Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FileText className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {events.filter((event: Event) => getEventStatus(event) === "draft").length}
                  </p>
                  <p className="text-sm text-gray-600">Draft Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {events.reduce((total: number, event: any) => {
                      // Only count open slots for published events that are not past
                      if (getEventStatus(event) === 'published') {
                        const stats = getEventStats(event);
                        return total + stats.openSlots;
                      }
                      return total;
                    }, 0)}
                  </p>
                  <p className="text-sm text-gray-600">Open Volunteer Opportunities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          
          
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-700">
                    {events.filter((event: Event) => isPastEvent(event)).length}
                  </p>
                  <p className="text-sm text-gray-600">Past Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recently Deleted Card - Mobile Only */}
          <Card 
            className="md:hidden border-0 bg-gradient-to-br from-red-400 to-red-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ring-2 ring-red-200"
            onClick={() => navigate("/recently-deleted")}
          >
            <CardContent className="p-4 h-full min-h-[120px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center gap-2 text-center w-full">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <p className="text-base font-semibold text-white">Recently Deleted</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-white">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Your Events</CardTitle>
                <CardDescription className="text-gray-600">
                  Manage your events and track volunteer participation

                </CardDescription>
              </div>
              
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 w-full sm:w-64 border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20"
                  />
                </div>
                
                {/* Filter Pills */}
                <div className="overflow-x-auto -mx-4 px-4">
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-full sm:w-fit">
                    <Button
                      variant={eventFilter === 'all' ? 'default' : 'ghost'}
                      onClick={() => setEventFilter('all')}
                      className={`h-7 px-2 sm:px-3 text-xs rounded-md transition-all whitespace-nowrap flex-1 sm:flex-none sm:w-auto font-medium ${
                        eventFilter === 'all' 
                          ? 'bg-[#5c5b2f] text-white shadow-md border border-[#5c5b2f]/20' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 bg-transparent'
                      }`}
                    >
                      All ({events.length})
                    </Button>
                    <Button
                      variant={eventFilter === 'published' ? 'default' : 'ghost'}
                      onClick={() => setEventFilter('published')}
                      className={`h-7 px-2 sm:px-3 text-xs rounded-md transition-all whitespace-nowrap flex-1 sm:flex-none sm:w-auto font-medium ${
                        eventFilter === 'published' 
                          ? 'bg-[#5c5b2f] text-white shadow-md border border-[#5c5b2f]/20' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 bg-transparent'
                      }`}
                    >
                      Published ({events.filter((event: Event) => getEventStatus(event) === "published").length})
                    </Button>
                    <Button
                      variant={eventFilter === 'draft' ? 'default' : 'ghost'}
                      onClick={() => setEventFilter('draft')}
                      className={`h-7 px-2 sm:px-3 text-xs rounded-md transition-all whitespace-nowrap flex-1 sm:flex-none sm:w-auto font-medium ${
                        eventFilter === 'draft' 
                          ? 'bg-[#5c5b2f] text-white shadow-md border border-[#5c5b2f]/20' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 bg-transparent'
                      }`}
                    >
                      Drafts ({events.filter((event: Event) => getEventStatus(event) === "draft").length})
                    </Button>
                    <Button
                      variant={eventFilter === 'past' ? 'default' : 'ghost'}
                      onClick={() => setEventFilter('past')}
                      className={`h-7 px-2 sm:px-3 text-xs rounded-md transition-all whitespace-nowrap flex-1 sm:flex-none sm:w-auto font-medium ${
                        eventFilter === 'past' 
                          ? 'bg-[#5c5b2f] text-white shadow-md border border-[#5c5b2f]/20' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 bg-transparent'
                      }`}
                    >
                      Past ({events.filter((event: Event) => isPastEvent(event)).length})
                    </Button>
                  </div>
                </div>
                
                {/* Clear Filters */}
                {(eventFilter !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {getFilteredEvents().length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  {events.length === 0 ? "Start Organizing Events" : "No Events Match Filters"}
                </h3>
                <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                  {events.length === 0 
                    ? "Create your first event and start coordinating volunteers"
                    : "Try adjusting your search or filters to find what you're looking for."
                  }
                </p>
                {events.length === 0 && (
                  <Button 
                    onClick={() => navigate("/events/create")}
                    className="bg-[#5c5b2f] hover:bg-[#4a4a28] text-white px-6 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Event
                  </Button>
                )}
              </div>
            ) : (
              <>
                {isMobile ? (
                  <div className="p-4 space-y-3">
                    {getFilteredEvents().map((event: any) => {
                      const stats = getEventStats(event);
                      return (
                        <div key={event.id} className={`rounded-xl p-4 border shadow-sm ${
                          isPastEvent(event) ? 'border-gray-300 bg-gray-100' : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
                                {event.title}
                                {isAdmin && event.created_by !== currentUser?.id && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {`By ${creatorNames[event.created_by] || 'Other User'}`}
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-gray-600 text-xs mb-1">{event.location}</p>
                              <p className="text-gray-600 text-xs">
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
                            <div className="flex flex-col gap-1">
                              {!isPastEvent(event) ? (
                                <div className="flex items-center space-x-1.5">
                                  <Switch
                                    checked={event.status === 'published'}
                                    onCheckedChange={async (checked) => {
                                      const newStatus = checked ? 'published' : 'draft';
                                      try {
                                        const { data, error } = await supabase
                                          .from('events')
                                          .update({ status: newStatus })
                                          .eq('id', event.id)
                                          .select('id, status')
                                          .single();

                                        if (error || !data) {
                                          console.error('Error updating status:', error || 'No rows updated');
                                          toast({
                                            title: "Error",
                                            description: "Failed to update event status",
                                            variant: "destructive",
                                          });
                                          return;
                                        }

                                        setEvents(prev => prev.map(e =>
                                          e.id === event.id ? { ...e, status: data.status as 'draft' | 'published' } : e
                                        ));

                                        toast({
                                          title: "Status Updated",
                                          description: `Event is now ${checked ? 'live' : 'a draft'}`,
                                        });
                                      } catch (error) {
                                        console.error('Error:', error);
                                        toast({
                                          title: "Error",
                                          description: "Failed to update event status",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    disabled={!hasEditPermission(event)}
                                  />
                                  <span className={`text-[10px] font-medium ${event.status === 'published' ? 'text-green-700' : 'text-yellow-700'}`}>
                                    {event.status === 'published' ? 'Live' : 'Draft'}
                                  </span>
                                </div>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-800 border-gray-300"
                                >
                                  Past
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-600">Volunteers</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {stats.filledSlots} / {stats.totalSlots}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div 
                                className="bg-[#5c5b2f] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${stats.totalSlots > 0 ? (stats.filledSlots / stats.totalSlots) * 100 : 0}%` }}
                              ></div>
                            </div>
                            {stats.openSlots > 0 && (
                              <div className="text-gray-600 text-xs mt-1">
                                {stats.openSlots} open spots
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            {/* Primary Actions - Always visible */}
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => navigate(`/${createEventSlug(event.title, event.id)}/checkin`)}
                                className="flex-1 text-xs bg-[#5c5b2f] hover:bg-[#4a4a28] text-white border-[#5c5b2f]"
                              >
                                <LogIn className="w-3 h-3 mr-1" />
                                Check In
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/events/${event.id}/edit`)}
                                className="flex-1 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-3 h-3 mr-1 text-yellow-600" />
                                Edit
                              </Button>
                            </div>

                            {/* Secondary Actions */}
                            {getEventStatus(event) === "published" && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copySignupLink(event)}
                                  className="flex-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy Link
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openSignupLink(event)}
                                  className="flex-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <ArrowUpRight className="w-3 h-3 mr-1" />
                                  Open Link
                                </Button>
                              </div>
                            )}
                            {getEventStatus(event) === "past" && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copySignupLink(event)}
                                  className="flex-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy Link
                                </Button>
                              </div>
                            )}

                            {/* Destructive Action - Separated */}
                            <div className={`flex items-center ${isPastEvent(event) ? 'justify-end' : 'justify-between'} space-x-2`}>
                              {!isPastEvent(event) && (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={event.is_public ?? true}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        const { data, error } = await supabase
                                          .from('events')
                                          .update({ is_public: checked })
                                          .eq('id', event.id)
                                          .select('id, is_public')
                                          .single();

                                        if (error || !data) {
                                          console.error('Error updating visibility:', error || 'No rows updated');
                                          toast({
                                            title: "Error",
                                            description: "Failed to update event visibility",
                                            variant: "destructive",
                                          });
                                          return;
                                        }

                                        // Update local state with confirmed DB value
                                        setEvents(prev => prev.map(e =>
                                          e.id === event.id ? { ...e, is_public: data.is_public } : e
                                        ));

                                        toast({
                                          title: "Visibility Updated",
                                          description: `Event is now ${data.is_public ? 'public' : 'private'}`,
                                        });
                                      } catch (error) {
                                        console.error('Error:', error);
                                        toast({
                                          title: "Error",
                                          description: "Failed to update event visibility",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    disabled={!hasEditPermission(event)}
                                  />
                                  <span className="text-xs text-gray-600">
                                    {event.is_public ? 'Public' : 'Private'}
                                  </span>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteDialog({ isOpen: true, event })}
                                className="px-4 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/50">
                          <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Event</th>
                          <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Date & Time</th>
                          <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Volunteers</th>
                          <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Status</th>
                          <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredEvents().map((event: any, index) => {
                          const stats = getEventStats(event);
                          return (
                            <tr key={event.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150 ${
                              isPastEvent(event) ? 'bg-gray-100' : ''
                            }`}>
                              <td className="py-4 px-6">
                                <div>
                                  <div className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
                                    {event.title}
                                    {isAdmin && event.created_by !== currentUser?.id && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {`By ${creatorNames[event.created_by] || 'Other User'}`}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-gray-600 text-xs">{event.location}</div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="space-y-1">
                                  <div className="text-gray-900 font-medium text-sm">
                                    {new Date(event.start_datetime).toLocaleDateString('en-US', { 
                                      weekday: 'short', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    {displayTimeInMichigan(event.start_datetime)}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-semibold text-gray-900">
                                      {stats.filledSlots} / {stats.totalSlots}
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div 
                                      className="bg-[#5c5b2f] h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${stats.totalSlots > 0 ? (stats.filledSlots / stats.totalSlots) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                  {stats.openSlots > 0 && (
                                    <div className="text-gray-600 text-xs">
                                      {stats.openSlots} open spots
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                {!isPastEvent(event) ? (
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={event.status === 'published'}
                                      onCheckedChange={async (checked) => {
                                        const newStatus = checked ? 'published' : 'draft';
                                        try {
                                          const { data, error } = await supabase
                                            .from('events')
                                            .update({ status: newStatus })
                                            .eq('id', event.id)
                                            .select('id, status')
                                            .single();

                                          if (error || !data) {
                                            console.error('Error updating status:', error || 'No rows updated');
                                            toast({
                                              title: "Error",
                                              description: "Failed to update event status",
                                              variant: "destructive",
                                            });
                                            return;
                                          }

                                          setEvents(prev => prev.map(e =>
                                            e.id === event.id ? { ...e, status: data.status as 'draft' | 'published' } : e
                                          ));

                                          toast({
                                            title: "Status Updated",
                                            description: `Event is now ${checked ? 'live' : 'a draft'}`,
                                          });
                                        } catch (error) {
                                          console.error('Error:', error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to update event status",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                      disabled={!hasEditPermission(event)}
                                    />
                                    <span className={`text-xs whitespace-nowrap ${event.status === 'published' ? 'text-green-700' : 'text-yellow-700'}`}>
                                      {event.status === 'published' ? 'Live' : 'Draft'}
                                    </span>
                                  </div>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-800 border-gray-300"
                                  >
                                    Past
                                  </Badge>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center space-x-2">
                                  {/* Primary Actions - Always visible */}
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={() => navigate(`/${createEventSlug(event.title, event.id)}/checkin`)}
                                      title="Check In"
                                      className="h-8 px-3 bg-[#5c5b2f] hover:bg-[#4a4a28] text-white border-[#5c5b2f]"
                                    >
                                      <LogIn className="w-4 h-4 mr-1" />
                                      Check In
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigate(`/events/${event.id}/edit`)}
                                      title="Edit Event"
                                      className="h-8 px-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                      <Edit className="w-4 h-4 mr-1 text-yellow-600" />
                                      Edit
                                    </Button>
                                  </div>

                                  {/* Secondary Actions */}
                                  {getEventStatus(event) === "published" && (
                                    <div className="flex items-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copySignupLink(event)}
                                        title="Copy Signup Link"
                                        className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openSignupLink(event)}
                                        title="Open Signup Link"
                                        className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                      >
                                        <ArrowUpRight className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                  {getEventStatus(event) === "past" && (
                                    <div className="flex items-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copySignupLink(event)}
                                        title="Copy Signup Link"
                                        className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}

                                  {/* Visibility Toggle and Delete - Separated with divider */}
                                  <div className="flex items-center space-x-2">
                                    {!isPastEvent(event) && (
                                      <>
                                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={event.is_public !== false}
                                            onCheckedChange={async (checked) => {
                                              try {
                                                const { data, error } = await supabase
                                                  .from('events')
                                                  .update({ is_public: checked })
                                                  .eq('id', event.id)
                                                  .select('id, is_public')
                                                  .single();

                                                if (error || !data) {
                                                  console.error('Error updating visibility:', error || 'No rows updated');
                                                  toast({
                                                    title: "Error",
                                                    description: "Failed to update event visibility",
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }

                                                // Update local state with confirmed DB value
                                                setEvents(prev => prev.map(e =>
                                                  e.id === event.id ? { ...e, is_public: data.is_public } : e
                                                ));

                                                toast({
                                                  title: "Visibility Updated",
                                                  description: `Event is now ${data.is_public ? 'public' : 'private'}`,
                                                });
                                              } catch (error) {
                                                console.error('Error:', error);
                                                toast({
                                                  title: "Error",
                                                  description: "Failed to update event visibility",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                            disabled={!hasEditPermission(event)}
                                          />
                                          <span className="text-xs text-gray-600 whitespace-nowrap">
                                            {event.is_public !== false ? 'Public' : 'Private'}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeleteDialog({ isOpen: true, event })}
                                      title="Delete Event"
                                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
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

        {/* Shared Events Section removed */}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, event: deleteDialog.event })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-800">Delete Event?</DialogTitle>
            <DialogDescription className="text-gray-600">
              This will move "{deleteDialog.event?.title}" to recently deleted. 
              You can recover it within 30 days, or it will be permanently removed.
            </DialogDescription>
            {deleteDialog.event && (
              <div className="mt-2">
                <span className="text-sm text-gray-600">Event status: </span>
                <Badge 
                  variant="secondary" 
                  className={deleteDialog.event.status === 'published' 
                    ? "bg-green-100 text-green-800 border-green-200 ml-2" 
                    : "bg-yellow-100 text-yellow-800 border-yellow-200 ml-2"
                  }
                >
                  {deleteDialog.event.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </div>
            )}
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false, event: null })}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.event && handleDeleteEvent(deleteDialog.event)}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? "Deleting..." : "Delete Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sharing dialog removed */}
    </div>
  );
};

export default Dashboard;
