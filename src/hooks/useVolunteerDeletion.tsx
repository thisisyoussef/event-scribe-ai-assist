
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
    if (isDeleting) {
      console.log(`[DELETION] Already deleting, ignoring request`);
      return false;
    }

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

      console.log(`[DELETION] Calling Edge Function with password`);
      
      // Call the Edge Function to delete the volunteer
      const { data, error } = await supabase.functions.invoke('delete-volunteer', {
        body: {
          volunteerId,
          volunteerName,
          adminPassword
        }
      });

      console.log(`[DELETION] Edge Function response received:`, { data, error });

      // Handle connection/network errors
      if (error) {
        console.error(`[DELETION] Network/Connection error:`, error);
        toast({
          title: "Connection Error", 
          description: error.message || "Failed to connect to server.",
          variant: "destructive",
        });
        return false;
      }

      // Handle successful deletion
      if (data?.success === true) {
        console.log(`[DELETION] ✅ SUCCESS: Volunteer deleted successfully`);
        
        toast({
          title: "Volunteer Removed",
          description: data.message || `${volunteerName} has been successfully removed from the event.`,
        });

        return true;
      }

      // Handle server-side errors (wrong password, volunteer not found, etc.)
      if (data?.error) {
        console.error(`[DELETION] ❌ Server error:`, data.error);
        toast({
          title: "Deletion Failed",
          description: data.error,
          variant: "destructive",
        });
        return false;
      }

      // Unexpected response format
      console.error(`[DELETION] ❌ Unexpected response:`, data);
      toast({
        title: "Unexpected Error",
        description: "Received unexpected response from server.",
        variant: "destructive",
      });
      
      return false;

    } catch (error) {
      console.error(`[DELETION] ❌ Unexpected exception:`, error);
      toast({
        title: "Deletion Failed",
        description: "An unexpected error occurred while deleting the volunteer.",
        variant: "destructive",
      });
      return false;
    } finally {
      console.log(`[DELETION] Setting isDeleting to false`);
      setIsDeleting(false);
    }
  };

  return {
    deleteVolunteer,
    isDeleting
  };
};
