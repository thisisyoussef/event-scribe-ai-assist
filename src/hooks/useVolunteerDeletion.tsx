
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Volunteer } from "@/types/database";

export const useVolunteerDeletion = () => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteVolunteer = async (
    volunteerId: string, 
    volunteerName: string, 
    adminPassword?: string
  ): Promise<boolean> => {
    setIsDeleting(true);
    
    try {
      console.log(`[DELETION] Starting deletion process for volunteer ${volunteerId} (${volunteerName})`);
      
      // Verify admin password if provided
      if (adminPassword) {
        const expectedPassword = "admin123"; // This should be configurable
        if (adminPassword !== expectedPassword) {
          console.log(`[DELETION] Incorrect password provided: ${adminPassword}`);
          toast({
            title: "Incorrect Password",
            description: "The admin password you entered is incorrect.",
            variant: "destructive",
          });
          return false;
        }
        console.log(`[DELETION] Admin password verified successfully`);
      }

      // First, verify the volunteer exists and get their details
      console.log(`[DELETION] Checking if volunteer ${volunteerId} exists in database`);
      const { data: existingVolunteer, error: checkError } = await supabase
        .from('volunteers')
        .select('*')
        .eq('id', volunteerId)
        .maybeSingle();

      if (checkError) {
        console.error(`[DELETION] Error checking volunteer existence:`, checkError);
        toast({
          title: "Database Error",
          description: `Failed to verify volunteer: ${checkError.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (!existingVolunteer) {
        console.log(`[DELETION] Volunteer ${volunteerId} not found in database`);
        toast({
          title: "Volunteer Not Found",
          description: `${volunteerName} was not found in the database.`,
          variant: "destructive",
        });
        return false;
      }

      console.log(`[DELETION] Volunteer found in database:`, existingVolunteer);

      // Check current user authentication for RLS
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error(`[DELETION] Authentication error:`, userError);
        toast({
          title: "Authentication Error",
          description: "You must be logged in to delete volunteers.",
          variant: "destructive",
        });
        return false;
      }
      
      console.log(`[DELETION] User authenticated: ${user.id}`);

      // Check if the event belongs to the current user (for RLS)
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, created_by, title')
        .eq('id', existingVolunteer.event_id)
        .maybeSingle();

      if (eventError) {
        console.error(`[DELETION] Error checking event ownership:`, eventError);
        toast({
          title: "Event Verification Failed",
          description: "Could not verify event ownership.",
          variant: "destructive",
        });
        return false;
      }

      if (!eventData) {
        console.log(`[DELETION] Event not found for volunteer`);
        toast({
          title: "Event Not Found",
          description: "The event associated with this volunteer was not found.",
          variant: "destructive",
        });
        return false;
      }

      if (eventData.created_by !== user.id) {
        console.log(`[DELETION] User ${user.id} does not own event ${eventData.id} (owner: ${eventData.created_by})`);
        toast({
          title: "Permission Denied",
          description: "You can only delete volunteers from your own events.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`[DELETION] Event ownership verified. Proceeding with deletion.`);

      // Perform the actual deletion
      console.log(`[DELETION] Executing DELETE query for volunteer ${volunteerId}`);
      const { error: deleteError, count } = await supabase
        .from('volunteers')
        .delete({ count: 'exact' })
        .eq('id', volunteerId);

      if (deleteError) {
        console.error(`[DELETION] Delete operation failed:`, deleteError);
        toast({
          title: "Deletion Failed",
          description: `Failed to delete volunteer: ${deleteError.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log(`[DELETION] Delete operation completed. Rows affected: ${count}`);

      if (count === 0) {
        console.log(`[DELETION] No rows were deleted - volunteer may have already been removed`);
        toast({
          title: "Volunteer Not Found",
          description: "The volunteer may have already been removed.",
          variant: "destructive",
        });
        return false;
      }

      // Verify the deletion was successful
      console.log(`[DELETION] Verifying deletion by checking if volunteer still exists`);
      const { data: verificationData, error: verifyError } = await supabase
        .from('volunteers')
        .select('id')
        .eq('id', volunteerId)
        .maybeSingle();

      if (verifyError && verifyError.code !== 'PGRST116') {
        console.error(`[DELETION] Verification query failed:`, verifyError);
        toast({
          title: "Verification Error",
          description: "Could not verify if volunteer was deleted successfully.",
          variant: "destructive",
        });
        return false;
      }

      if (verificationData) {
        console.error(`[DELETION] CRITICAL: Volunteer ${volunteerId} still exists after deletion!`);
        toast({
          title: "Deletion Failed",
          description: "The volunteer could not be removed from the database.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`[DELETION] SUCCESS: Volunteer ${volunteerId} (${volunteerName}) has been completely removed from the database`);
      
      toast({
        title: "Volunteer Removed",
        description: `${volunteerName} has been successfully removed from the event.`,
      });

      return true;

    } catch (error) {
      console.error(`[DELETION] Unexpected error during deletion:`, error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while deleting the volunteer.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteVolunteer,
    isDeleting
  };
};
