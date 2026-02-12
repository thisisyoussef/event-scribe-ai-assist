import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useAutoCleanup = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Manually trigger cleanup for events that ended 5+ hours ago
  const triggerCleanup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('trigger_cleanup_no_shows');

      if (error) {
        throw error;
      }

      const results = data || [];
      
      if (results.length === 0) {
        toast({
          title: "No Cleanup Needed",
          description: "No events found that ended 5+ hours ago with no-show volunteers.",
        });
      } else {
        const totalRemoved = results.reduce((sum: number, event: any) => 
          sum + (event.removed_contacts?.length || 0), 0
        );
        
        toast({
          title: "Cleanup Complete",
          description: `Processed ${results.length} events and removed ${totalRemoved} no-show volunteers from contacts database.`,
        });
      }

      return results;
    } catch (error) {
      console.error('Error triggering cleanup:', error);
      toast({
        title: "Error",
        description: "Failed to trigger cleanup. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get cleanup logs for an event
  const getCleanupLogs = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('cleaned_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting cleanup logs:', error);
      throw error;
    }
  };

  // Get all cleanup logs (for admin view)
  const getAllCleanupLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('cleaned_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting all cleanup logs:', error);
      throw error;
    }
  };

  return {
    isLoading,
    triggerCleanup,
    getCleanupLogs,
    getAllCleanupLogs
  };
};























