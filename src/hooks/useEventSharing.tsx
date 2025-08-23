import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventShare, Event, SharedEventAccess } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useEventSharing = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Share an event with another user
  const shareEvent = async (
    eventId: string,
    userEmail: string,
    permissionLevel: 'view' | 'edit'
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to share events.",
          variant: "destructive",
        });
        return false;
      }

      // Use the Supabase Edge Function to share the event
      const { data, error } = await supabase.functions.invoke('share-event', {
        body: {
          eventId,
          userEmail,
          permissionLevel,
          action: 'share',
          currentUserId: user.id
        }
      });

      if (error) {
        toast({
          title: "Error sharing event",
          description: error.message || "Failed to share event. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Check if the function returned an error in the response body
      if (data && data.error) {
        toast({
          title: "Error sharing event",
          description: data.error,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Event shared successfully",
        description: `Event shared with ${userEmail} (${permissionLevel} access).`,
      });
      return true;
    } catch (error) {
      console.error('Error sharing event:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sharing the event.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get all shares for an event
  const getEventShares = async (eventId: string): Promise<EventShare[]> => {
    try {
      console.log('Fetching shares for event:', eventId);

      // Use RPC to fetch shares with emails to avoid RLS joins
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_event_shares_with_emails', { p_event_id: eventId });

      console.log('RPC shares result:', { rpcData, rpcError });

      if (rpcError) {
        console.error('RPC error fetching event shares:', rpcError);
        return [];
      }

      if (!rpcData) return [];

      const mapped: EventShare[] = rpcData.map((row: any) => ({
        id: row.id,
        event_id: row.event_id,
        shared_by: row.shared_by,
        shared_with: row.shared_with,
        permission_level: row.permission_level,
        created_at: row.created_at,
        updated_at: row.updated_at,
        shared_with_profile: row.shared_with_email ? { id: row.shared_with, email: row.shared_with_email, full_name: row.shared_with_full_name } as any : undefined,
        shared_by_profile: row.shared_by_email ? { id: row.shared_by, email: row.shared_by_email, full_name: row.shared_by_full_name } as any : undefined,
      }));

      console.log('Mapped shares with emails:', mapped);
      return mapped;
    } catch (error) {
      console.error('Error in getEventShares:', error);
      return [];
    }
  };

  // Get events shared with the current user
  const getSharedEvents = async (): Promise<SharedEventAccess[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('event_shares')
        .select(`
          *,
          event:events(*)
        `)
        .eq('shared_with', user.id);

      if (error) {
        console.error('Error fetching shared events:', error);
        return [];
      }

      return (data || []).map(share => ({
        event: share.event,
        permission_level: share.permission_level,
        shared_by: share.shared_by,
        shared_at: share.created_at,
      }));
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  };

  // Remove a share
  const removeShare = async (shareId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('event_shares')
        .delete()
        .eq('id', shareId);

      if (error) {
        toast({
          title: "Error removing share",
          description: "Failed to remove sharing access.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Share removed",
        description: "Sharing access has been removed.",
      });
      return true;
    } catch (error) {
      console.error('Error removing share:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while removing the share.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if current user has access to an event
  const checkEventAccess = async (
    eventId: string,
    requiredPermission: 'view' | 'edit' = 'view'
  ): Promise<{ hasAccess: boolean; permissionLevel: 'view' | 'edit' | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { hasAccess: false, permissionLevel: null };

      // Check if user owns the event
      const { data: ownedEvent } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .eq('created_by', user.id)
        .single();

      if (ownedEvent) {
        return { hasAccess: true, permissionLevel: 'edit' };
      }

      // Check if event is shared with user
      const { data: share } = await supabase
        .from('event_shares')
        .select('permission_level')
        .eq('event_id', eventId)
        .eq('shared_with', user.id)
        .single();

      if (!share) {
        return { hasAccess: false, permissionLevel: null };
      }

      // Check permission level
      if (requiredPermission === 'edit' && share.permission_level === 'view') {
        return { hasAccess: false, permissionLevel: 'view' };
      }

      return { hasAccess: true, permissionLevel: share.permission_level };
    } catch (error) {
      console.error('Error checking event access:', error);
      return { hasAccess: false, permissionLevel: null };
    }
  };

  return {
    shareEvent,
    getEventShares,
    getSharedEvents,
    removeShare,
    checkEventAccess,
    isLoading,
  };
};
