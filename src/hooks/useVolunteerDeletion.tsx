
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
      console.log(`Starting deletion of volunteer ${volunteerId} (${volunteerName})`);
      
      // Verify admin password if provided
      if (adminPassword) {
        const expectedPassword = "admin123"; // This should be configurable
        if (adminPassword !== expectedPassword) {
          toast({
            title: "Incorrect Password",
            description: "The admin password you entered is incorrect.",
            variant: "destructive",
          });
          return false;
        }
      }

      // First, check if volunteer exists
      const { data: existingVolunteer, error: checkError } = await supabase
        .from('volunteers')
        .select('id, name, event_id')
        .eq('id', volunteerId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking volunteer existence:', checkError);
        toast({
          title: "Database Error",
          description: `Failed to check volunteer: ${checkError.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (!existingVolunteer) {
        console.log('Volunteer not found in database');
        toast({
          title: "Volunteer Not Found",
          description: `${volunteerName} was not found in the database.`,
          variant: "destructive",
        });
        return false;
      }

      // Perform the deletion
      const { error: deleteError } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', volunteerId);

      if (deleteError) {
        console.error('Error deleting volunteer:', deleteError);
        toast({
          title: "Deletion Failed",
          description: `Failed to delete volunteer: ${deleteError.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Verify deletion was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('volunteers')
        .select('id')
        .eq('id', volunteerId)
        .maybeSingle();

      if (verifyError && verifyError.code !== 'PGRST116') {
        console.error('Error verifying deletion:', verifyError);
        toast({
          title: "Verification Error",
          description: "Could not verify if volunteer was deleted.",
          variant: "destructive",
        });
        return false;
      }

      if (verifyData) {
        console.error('Volunteer still exists after deletion!');
        toast({
          title: "Deletion Failed",
          description: "The volunteer could not be removed from the database.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`Successfully deleted volunteer ${volunteerId}`);
      toast({
        title: "Volunteer Removed",
        description: `${volunteerName} has been successfully removed from the event.`,
      });

      return true;

    } catch (error) {
      console.error('Unexpected error during deletion:', error);
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
