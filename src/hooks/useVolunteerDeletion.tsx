
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      
      if (!adminPassword) {
        console.log(`[DELETION] No admin password provided`);
        toast({
          title: "Admin Password Required",
          description: "Please enter the admin password to delete volunteers.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`[DELETION] Calling Edge Function to delete volunteer`);
      
      // Call the Edge Function to delete the volunteer
      const { data, error } = await supabase.functions.invoke('delete-volunteer', {
        body: {
          volunteerId,
          volunteerName,
          adminPassword
        }
      });

      if (error) {
        console.error(`[DELETION] Edge Function error:`, error);
        toast({
          title: "Deletion Failed",
          description: error.message || "Failed to delete volunteer.",
          variant: "destructive",
        });
        return false;
      }

      console.log(`[DELETION] Edge Function response:`, data);

      // Check if the response indicates an error
      if (data && data.error) {
        console.error(`[DELETION] Edge Function returned error:`, data.error);
        toast({
          title: "Deletion Failed",
          description: data.error,
          variant: "destructive",
        });
        return false;
      }

      // Success case - the response should have success: true
      if (data && data.success) {
        console.log(`[DELETION] SUCCESS: ${data.message || `${volunteerName} has been successfully removed`}`);
        
        toast({
          title: "Volunteer Removed",
          description: data.message || `${volunteerName} has been successfully removed from the event.`,
        });

        return true;
      }

      // If we get here, something unexpected happened
      console.error(`[DELETION] Unexpected response format:`, data);
      toast({
        title: "Unexpected Response",
        description: "The deletion may have succeeded, but we received an unexpected response.",
        variant: "destructive",
      });
      
      // Return false to be safe, even though deletion might have worked
      return false;

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
