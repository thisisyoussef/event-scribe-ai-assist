
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event, VolunteerRole, Volunteer } from "@/types/database";
import { useVolunteerDeletion } from "@/hooks/useVolunteerDeletion";
import VolunteerDeletionDialog from "@/components/volunteer/VolunteerDeletionDialog";
import { useEventSharing } from "@/hooks/useEventSharing";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import CheckInManager from "@/components/volunteer/CheckInManager";
import NoShowCleanup from "@/components/volunteer/NoShowCleanup";
import { useVolunteerCheckIn } from "@/hooks/useVolunteerCheckIn";
import { createEventSlug } from "@/utils/eventUtils";

// Function to create a stable slug that won't change when title is edited
const createStableEventSlug = (id: string): string => {
  return `event-${id.slice(-8)}`;
};

// Normalize various stored formats of suggested_poc into an array of contact IDs
// Handles:
// - string[] (already parsed)
// - string with JSON array (e.g., "[\"id1\",\"id2\"]")
// - CSV string (e.g., "id1,id2")
// - Postgres array text (e.g., "{id1,id2}")
const normalizeSuggestedPocToIds = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return (value as unknown[]).map(v => String(v)).filter(Boolean);
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];
    // Try JSON array first
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(v => String(v)).filter(Boolean);
        }
      } catch {}
    }
    // Handle Postgres array or CSV
    const cleaned = raw.replace(/[{}\[\]"]+/g, '');
    return cleaned.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const EventRoster = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { deleteVolunteer, isDeleting } = useVolunteerDeletion();
  const { checkEventAccess } = useEventSharing();
  const { isAdmin } = useAdminStatus();
  const { updateVolunteerCheckInStatus } = useVolunteerCheckIn();
  const [event, setEvent] = useState<(Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    volunteer: Volunteer | null;
  }>({
    isOpen: false,
    volunteer: null,
  });

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      await loadEvent();
    };
    
    checkUser();
  }, [slug, navigate]);

  const loadEvent = async () => {
    if (!slug) return;
    
    try {
      console.log("Loading event with slug:", slug);
      
      // Fetch all events the user has access to (owned or shared)
      let events: Event[] | null = null;
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .order('start_datetime', { ascending: false });

      if (eventsError) {
        console.error('Error loading events:', eventsError);
        // Try RPC as fallback
        const { data: sharedEvents } = await supabase
          .rpc('get_shared_events');
        
        if (!sharedEvents) {
          setEvent(null);
          return;
        }
        events = sharedEvents.map((row: any) => row.event);
      } else {
        events = eventsData;
      }

      // Find the event that matches the slug
      let matchingEvent = events?.find(event => {
        // First try to match by title-based slug (new format)
        const eventSlugGenerated = createEventSlug(event.title, event.id);
        if (eventSlugGenerated === slug) {
          return true;
        }
        
        // Then try to match by legacy stable slug (event-xxxxxxxx format) for backward compatibility
        const stableSlug = createStableEventSlug(event.id);
        if (stableSlug === slug) {
          return true;
        }
        
        return false;
      });

      // Fallback: match by unique id suffix for both formats
      if (!matchingEvent && slug) {
        if (slug.startsWith('event-')) {
          // Legacy stable slug format: event-xxxxxxxx
          const suffix = slug.replace('event-', '');
          if (suffix.length === 8) {
            matchingEvent = events?.find(e => e.id.endsWith(suffix));
          }
        } else {
          // Title-based slug format: title-xxxx
          const parts = slug.split('-');
          const suffix = parts[parts.length - 1] || '';
          if (suffix.length === 4) {
            matchingEvent = events?.find(e => e.id.endsWith(suffix));
          }
        }
      }

      if (!matchingEvent) {
        console.log("Event not found for slug:", slug);
        setEvent(null);
        return;
      }

      const eventId = matchingEvent.id;

      // Now fetch the full event data with volunteers and roles
      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
        .eq('id', eventId)
        .maybeSingle();

      if (error || !eventData) {
        if (error) {
          console.error('Error loading event details:', error);
        } else {
          console.log('No event found via direct select; trying RPC');
        }
        // Fallback via RPC for shared users
        const { data: sharedData, error: sharedError } = await supabase
          .rpc('get_shared_event_detail', { p_event_id: eventId });

        if (sharedError) {
          console.error('RPC error loading shared event:', sharedError);
          setEvent(null);
          return;
        }

        if (!sharedData || sharedData.length === 0) {
          console.log('RPC returned no data for shared event');
          setEvent(null);
          return;
        }

        const row = sharedData[0];
        const merged = {
          ...(row.event as any),
          volunteer_roles: (row.volunteer_roles as any[]) || [],
          volunteers: (row.volunteers as any[]) || [],
        } as Event & { volunteer_roles?: VolunteerRole[]; volunteers?: Volunteer[] };

        // Populate POC contacts for volunteer roles (shared event)
        if (merged.volunteer_roles && merged.volunteer_roles.length > 0) {
          // Collect all unique POC IDs from all roles (normalized)
          const uniquePocIds: string[] = [];
          merged.volunteer_roles.forEach(role => {
            const ids = normalizeSuggestedPocToIds((role as any).suggested_poc);
            ids.forEach(id => {
              if (id && !uniquePocIds.includes(id)) uniquePocIds.push(id);
            });
          });

          // Fetch POC contacts if there are any
          if (uniquePocIds.length > 0) {
            console.log("Fetching POC contacts for shared event IDs:", uniquePocIds);
            const { data: contacts, error: contactsError } = await supabase
              .from('contacts')
              .select('id, name, phone, email')
              .in('id', uniquePocIds);
            
            if (!contactsError && contacts) {
              console.log("Fetched POC contacts for shared event:", contacts);
              // Map contact names to the volunteer roles
              merged.volunteer_roles = merged.volunteer_roles.map(role => {
                const ids = normalizeSuggestedPocToIds((role as any).suggested_poc);
                const pocContacts = ids
                  .map(pocId => contacts.find(contact => contact.id === pocId))
                  .filter(Boolean) as any[];
                return {
                  ...role,
                  poc_contacts: pocContacts,
                  poc_contact: pocContacts[0]
                };
              });
            } else {
              console.error("Error fetching POC contacts for shared event:", contactsError);
            }
          }
        }

        console.log('Loaded shared event via RPC:', merged);
        setEvent(merged);
        // Check permissions for this event
        const { hasAccess, permissionLevel } = await checkEventAccess(eventId, 'edit');
        setHasEditPermission(hasAccess && permissionLevel === 'edit');
        return;
      }

      console.log("Found event:", eventData);
      console.log("📊 Volunteers data:", eventData.volunteers);
      console.log("📊 Volunteer roles data:", eventData.volunteer_roles);
      
      // Populate POC contacts for volunteer roles
      if (eventData.volunteer_roles && eventData.volunteer_roles.length > 0) {
        // Collect all unique POC IDs from all roles (normalized)
        const uniquePocIds: string[] = [];
        eventData.volunteer_roles.forEach(role => {
          const ids = normalizeSuggestedPocToIds((role as any).suggested_poc);
          ids.forEach(id => {
            if (id && !uniquePocIds.includes(id)) uniquePocIds.push(id);
          });
        });

        // Fetch POC contacts if there are any
        if (uniquePocIds.length > 0) {
          console.log("Fetching POC contacts for IDs:", uniquePocIds);
          const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('id, name, phone, email')
            .in('id', uniquePocIds);
          
          if (!contactsError && contacts) {
            console.log("Fetched POC contacts:", contacts);
            // Map contact names to the volunteer roles
            eventData.volunteer_roles = eventData.volunteer_roles.map(role => {
              const ids = normalizeSuggestedPocToIds((role as any).suggested_poc);
              const pocContacts = ids
                .map(pocId => contacts.find(contact => contact.id === pocId))
                .filter(Boolean) as any[];
              return {
                ...role,
                poc_contacts: pocContacts,
                poc_contact: pocContacts[0] // Keep legacy field for backward compatibility
              };
            });
          } else {
            console.error("Error fetching POC contacts:", contactsError);
          }
        }
      }
      
      setEvent(eventData as Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] });
      
      // Check permissions for this event
      const { hasAccess, permissionLevel } = await checkEventAccess(eventId, 'edit');
      console.log('🔐 Permission check:', { hasAccess, permissionLevel, eventId });
      setHasEditPermission(hasAccess && permissionLevel === 'edit');
    } catch (error) {
      console.error('Error:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (volunteer: Volunteer) => {
    setDeleteDialog({
      isOpen: true,
      volunteer,
    });
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!deleteDialog.volunteer) return;
    
    const success = await deleteVolunteer(
      deleteDialog.volunteer.id, 
      deleteDialog.volunteer.name, 
      password
    );
    
    if (success) {
      // Update local state to remove the volunteer
      setEvent(prev => prev ? {
        ...prev,
        volunteers: prev.volunteers?.filter(v => v.id !== deleteDialog.volunteer!.id) || []
      } : null);
      
      setDeleteDialog({ isOpen: false, volunteer: null });
    }
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteDialog({ isOpen: false, volunteer: null });
    }
  };

  const handleVolunteerUpdate = (updatedVolunteer: Volunteer) => {
    setEvent(prev => prev ? {
      ...prev,
      volunteers: prev.volunteers?.map(v => 
        v.id === updatedVolunteer.id ? updatedVolunteer : v
      ) || []
    } : null);
  };

  // Fallback polling: periodically refresh volunteers to reflect changes across POCs
  useEffect(() => {
    if (!event?.id) return;

    let intervalId: any;
    let isActive = true;

    const pollVolunteers = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`id, volunteers(*)`)
          .eq('id', event.id)
          .maybeSingle();

        if (!error && data && isActive && Array.isArray((data as any).volunteers)) {
          const latestVolunteers = (data as any).volunteers as Volunteer[];
          setEvent(prev => prev ? { ...prev, volunteers: latestVolunteers } : prev);
        }
      } catch (e) {
        // swallow errors during polling
      }
    };

    // initial poll and interval
    pollVolunteers();
    intervalId = setInterval(pollVolunteers, 4000);

    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [event?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-umma-700 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading event details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
              <div className="text-gray-600 mb-4">
                The event you're looking for doesn't exist or has been removed.
              </div>
              <Button onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 md:py-6 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="h-8 px-2 sm:px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Check In</span>
          </div>
        </div>

        {/* Header */}
        <div className="frosted-panel p-4 sm:p-5 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-2xl font-semibold tracking-tight text-stone-800 break-words">{event.title}</h1>
            <p className="mt-1.5 sm:mt-2 text-sm text-gray-600">
              Manage volunteer attendance and track who has arrived, marked themselves as running late, or needs special attention
            </p>
          </div>
        </div>

        {/* Check-In Manager */}
        {event.volunteers && event.volunteer_roles && (
          <div className="mb-4 sm:mb-5">
            <CheckInManager
              eventId={event.id}
              volunteers={event.volunteers}
              volunteerRoles={event.volunteer_roles}
              onVolunteerUpdate={handleVolunteerUpdate}
            />
          </div>
        )}

        {/* No-Show Cleanup - Super Admin Only */}
        {isAdmin && event.volunteers && event.volunteers.length > 0 && (
          <div className="mb-4 sm:mb-5">
            <NoShowCleanup
              eventId={event.id}
              eventTitle={event.title}
              onCleanupComplete={() => {
                // Reload event data after cleanup
                loadEvent();
              }}
            />
          </div>
        )}

        <VolunteerDeletionDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          volunteer={deleteDialog.volunteer}
          isDeleting={isDeleting}
        />
      </main>
    </div>
  );
};

export default EventRoster;
