import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { supabase } from "@/integrations/supabase/client";
import { Event } from "@/types/database";

export const useEventDeletion = () => {
  const { toast } = useToast();
  const { isAdmin } = useAdminStatus();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  console.log('useEventDeletion: isAdmin status:', isAdmin);

  // Soft delete an event using SECURITY DEFINER RPC
  const softDeleteEvent = async (eventId: string, eventTitle: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete events.",
          variant: "destructive",
        });
        return false;
      }

      console.log('Soft delete attempt:', { eventId, userId: user.id, isAdmin });

      const { data, error } = await supabase.rpc('soft_delete_event', {
        event_id: eventId,
        user_id: user.id
      });

      if (error) {
        console.error('Error soft deleting event:', error);
        toast({
          title: "Error",
          description: `Failed to delete event: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (!data) {
        toast({
          title: "Error",
          description: "Event not found or already deleted.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Event Deleted",
        description: `"${eventTitle}" has been moved to recently deleted. You can recover it within 30 days.`,
      });

      return true;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the event.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore a soft deleted event using SECURITY DEFINER RPC
  const restoreEvent = async (eventId: string, eventTitle: string): Promise<boolean> => {
    setIsRestoring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to restore events.",
          variant: "destructive",
        });
        return false;
      }

      const { data, error } = await supabase.rpc('restore_event', {
        event_id: eventId,
        user_id: user.id
      });

      if (error) {
        console.error('Error restoring event:', error);
        toast({
          title: "Error",
          description: `Failed to restore event: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (!data) {
        toast({
          title: "Error",
          description: "Event not found or not deleted.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Event Restored",
        description: `"${eventTitle}" has been successfully restored.`,
      });

      return true;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while restoring the event.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsRestoring(false);
    }
  };

  // Permanently delete an event
  const permanentlyDeleteEvent = async (eventId: string, eventTitle: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete events.",
          variant: "destructive",
        });
        return false;
      }

      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (deleteError) {
        console.error('Error permanently deleting event:', deleteError);
        toast({
          title: "Error",
          description: `Failed to permanently delete event: ${deleteError.message}`,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Event Permanently Deleted",
        description: `"${eventTitle}" has been permanently removed and cannot be recovered.`,
      });

      return true;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the event.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Permanently delete all soft-deleted events and templates
  const permanentlyDeleteAllEvents = async (): Promise<boolean> => {
    setIsDeletingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete items.",
          variant: "destructive",
        });
        return false;
      }

      // Get all soft-deleted events
      const eventsQuery = supabase
        .from('events')
        .select('id, title')
        .not('deleted_at', 'is', null);

      if (!isAdmin) {
        eventsQuery.eq('created_by', user.id);
      }

      const { data: softDeletedEvents, error: fetchEventsError } = await eventsQuery;

      if (fetchEventsError) {
        console.error('Error fetching soft deleted events:', fetchEventsError);
        toast({
          title: "Error",
          description: "Failed to fetch deleted events. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Get all soft-deleted templates
      const templatesQuery = supabase
        .from('event_templates')
        .select('id, name')
        .not('deleted_at', 'is', null);

      if (!isAdmin) {
        templatesQuery.eq('user_id', user.id);
      }

      const { data: softDeletedTemplates, error: fetchTemplatesError } = await templatesQuery;

      if (fetchTemplatesError) {
        console.error('Error fetching soft deleted templates:', fetchTemplatesError);
        toast({
          title: "Error",
          description: "Failed to fetch deleted templates. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      const totalEvents = softDeletedEvents?.length || 0;
      const totalTemplates = softDeletedTemplates?.length || 0;

      if (totalEvents === 0 && totalTemplates === 0) {
        toast({
          title: "No Items to Delete",
          description: "There are no deleted items to permanently remove.",
        });
        return false;
      }

      // Permanently delete all soft-deleted events
      if (totalEvents > 0) {
        const deleteEventsQuery = supabase
          .from('events')
          .delete()
          .not('deleted_at', 'is', null);

        if (!isAdmin) {
          deleteEventsQuery.eq('created_by', user.id);
        }

        const { error: deleteEventsError } = await deleteEventsQuery;

        if (deleteEventsError) {
          console.error('Error permanently deleting all events:', deleteEventsError);
          toast({
            title: "Error",
            description: "Failed to permanently delete events. Please try again.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Permanently delete all soft-deleted templates
      if (totalTemplates > 0) {
        const deleteTemplatesQuery = supabase
          .from('event_templates')
          .delete()
          .not('deleted_at', 'is', null);

        if (!isAdmin) {
          deleteTemplatesQuery.eq('user_id', user.id);
        }

        const { error: deleteTemplatesError } = await deleteTemplatesQuery;

        if (deleteTemplatesError) {
          console.error('Error permanently deleting all templates:', deleteTemplatesError);
          toast({
            title: "Error",
            description: "Failed to permanently delete templates. Please try again.",
            variant: "destructive",
          });
          return false;
        }
      }

      let description = '';
      if (totalEvents > 0 && totalTemplates > 0) {
        description = `${totalEvents} event${totalEvents === 1 ? '' : 's'} and ${totalTemplates} template${totalTemplates === 1 ? '' : 's'} have been permanently removed and cannot be recovered.`;
      } else if (totalEvents > 0) {
        description = `${totalEvents} event${totalEvents === 1 ? '' : 's'} ha${totalEvents === 1 ? 's' : 've'} been permanently removed and cannot be recovered.`;
      } else if (totalTemplates > 0) {
        description = `${totalTemplates} template${totalTemplates === 1 ? '' : 's'} ha${totalTemplates === 1 ? 's' : 've'} been permanently removed and cannot be recovered.`;
      }

      toast({
        title: "All Items Permanently Deleted",
        description,
      });

      return true;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting items.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Get soft deleted events for recovery
  const getSoftDeletedEvents = async (): Promise<Event[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Use regular client - RLS should allow reading deleted events
      const query = supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      // Only filter by created_by if not admin
      if (!isAdmin) {
        query.eq('created_by', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading soft deleted events:', error);
        return [];
      }

      // Ensure we only return events that are actually soft-deleted
      const filteredEvents = (data || []).filter((event: any) => event.deleted_at);
      console.log('Recently Deleted - Loaded events:', data?.length || 0, 'Filtered events:', filteredEvents.length);
      return filteredEvents as Event[];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  };

  return {
    isDeleting,
    isRestoring,
    isDeletingAll,
    softDeleteEvent,
    restoreEvent,
    permanentlyDeleteEvent,
    permanentlyDeleteAllEvents,
    getSoftDeletedEvents,
  };
};
