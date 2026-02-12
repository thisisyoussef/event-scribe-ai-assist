import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Volunteer } from '@/types/database';

export const useVolunteerCheckIn = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get no-show volunteers for an event
  const getNoShowVolunteers = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select(`
          id,
          name,
          phone,
          signup_date,
          checked_in_at,
          volunteer_roles!inner(role_label)
        `)
        .eq('event_id', eventId)
        .eq('status', 'confirmed')
        .is('checked_in_at', null);

      if (error) throw error;

      return (data || []).map((v: any) => ({
        volunteer_id: v.id,
        volunteer_name: v.name,
        volunteer_phone: v.phone,
        role_label: Array.isArray(v.volunteer_roles) ? v.volunteer_roles[0]?.role_label : v.volunteer_roles?.role_label,
        signup_date: v.signup_date || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error getting no-show volunteers:', error);
      throw error;
    }
  };

  // Clean up no-show volunteers from contacts database
  const cleanupNoShowVolunteers = async (eventId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('cleanup_no_show_volunteers', { p_event_id: eventId });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error cleaning up no-show volunteers:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete event and trigger cleanup
  const completeEventAndCleanup = async (eventId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('complete_event_and_cleanup', { p_event_id: eventId });

      if (error) throw error;
      return (data && data[0]) || null;
    } catch (error) {
      console.error('Error completing event and cleanup:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check in a volunteer via secure RPC
  const checkInVolunteer = async (volunteerId: string, notes?: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .rpc('update_volunteer_checkin_status', {
          p_volunteer_id: volunteerId,
          p_action: 'checkin',
          p_notes: notes || null,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Volunteer checked in successfully!' });
      return true;
    } catch (error) {
      console.error('Error checking in volunteer:', error);
      toast({ title: 'Error', description: 'Failed to check in volunteer. Please try again.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check out a volunteer via secure RPC
  const checkOutVolunteer = async (volunteerId: string, notes?: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .rpc('update_volunteer_checkin_status', {
          p_volunteer_id: volunteerId,
          p_action: 'checkout',
          p_notes: notes || null,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Volunteer checked out successfully!' });
      return true;
    } catch (error) {
      console.error('Error checking out volunteer:', error);
      toast({ title: 'Error', description: 'Failed to check out volunteer. Please try again.', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update volunteer check-in status locally
  const updateVolunteerCheckInStatus = (
    volunteers: Volunteer[],
    volunteerId: string,
    updates: Partial<Pick<Volunteer, 'checked_in_at' | 'checked_out_at' | 'check_in_notes'>>
  ): Volunteer[] => {
    return volunteers.map(volunteer =>
      volunteer.id === volunteerId
        ? { ...volunteer, ...updates }
        : volunteer
    );
  };

  // Get check-in statistics for an event
  const getCheckInStats = (volunteers: Volunteer[]) => {
    const total = volunteers.length;
    const checkedIn = volunteers.filter(v => v.checked_in_at).length;
    const checkedOut = volunteers.filter(v => v.checked_out_at).length;
    const notCheckedIn = total - checkedIn;

    return {
      total,
      checkedIn,
      checkedOut,
      notCheckedIn,
      checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0
    };
  };

  return {
    isLoading,
    getNoShowVolunteers,
    cleanupNoShowVolunteers,
    completeEventAndCleanup,
    checkInVolunteer,
    checkOutVolunteer,
    updateVolunteerCheckInStatus,
    getCheckInStats
  };
};
