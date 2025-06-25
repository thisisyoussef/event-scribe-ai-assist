import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event, VolunteerRole, Volunteer } from "@/types/database";

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

export const useVolunteerSignup = () => {
  const { eventSlug } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState<(Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Use refs to track ongoing requests and prevent duplicates
  const submissionInProgress = useRef(false);
  const currentSubmissionId = useRef<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventSlug]);

  const loadEvent = async () => {
    if (!eventSlug) return;
    
    try {
      console.log("Loading event with slug:", eventSlug);
      
      // First get all published events
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
        .eq('status', 'published');

      if (error) {
        console.error('Error loading events:', error);
        setEvent(null);
        return;
      }

      // Find the event that matches the slug
      const matchingEvent = events?.find(event => {
        const eventSlugGenerated = createEventSlug(event.title, event.id);
        return eventSlugGenerated === eventSlug;
      });

      if (!matchingEvent) {
        console.log("Event not found for slug:", eventSlug);
        setEvent(null);
        return;
      }

      console.log("Found event:", matchingEvent);
      setEvent(matchingEvent as Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] });
    } catch (error) {
      console.error('Error:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const getVolunteersForRole = (roleId: string) => {
    return event?.volunteers?.filter((v: Volunteer) => v.role_id === roleId) || [];
  };

  const getRemainingSlots = (role: VolunteerRole, gender?: "brother" | "sister") => {
    const volunteers = getVolunteersForRole(role.id);
    
    if (gender) {
      const genderVolunteers = volunteers.filter(v => v.gender === gender);
      const maxSlots = gender === 'brother' ? role.slots_brother : role.slots_sister;
      return maxSlots - genderVolunteers.length;
    }
    
    const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
    return totalSlots - volunteers.length;
  };

  const openSignupModal = (role: VolunteerRole) => {
    const remaining = getRemainingSlots(role);
    if (remaining <= 0) {
      toast({
        title: "Role Full",
        description: "This role is currently full. Please check other available roles.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const removeVolunteer = async (volunteerId: string, volunteerName: string, password?: string) => {
    try {
      console.log(`Attempting to remove volunteer ${volunteerId} (${volunteerName})`);
      
      // Check if password is provided for admin access
      if (password) {
        // Simple password check - in production, this should be more secure
        const adminPassword = "admin123"; // This should be configurable
        if (password !== adminPassword) {
          toast({
            title: "Incorrect Password",
            description: "The admin password you entered is incorrect.",
            variant: "destructive",
          });
          throw new Error('Incorrect password');
        }
      }

      // Use a more robust deletion approach with explicit transaction handling
      console.log('Starting deletion transaction for volunteer:', volunteerId);
      
      const { data: deletedData, error, count } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', volunteerId)
        .select('*');

      if (error) {
        console.error('Database error removing volunteer:', error);
        toast({
          title: "Database Error", 
          description: `Failed to remove volunteer: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }

      // Check if deletion actually happened
      if (!deletedData || deletedData.length === 0) {
        console.log('No rows were deleted - volunteer may not exist');
        
        // Update local state to remove from UI anyway
        setEvent(prev => {
          if (!prev) return null;
          
          const updatedVolunteers = prev.volunteers?.filter(v => v.id !== volunteerId) || [];
          console.log(`Updated local state - removed volunteer ${volunteerId} from UI`);
          return {
            ...prev,
            volunteers: updatedVolunteers
          };
        });

        toast({
          title: "Volunteer Not Found",
          description: `${volunteerName} may have already been removed from the event.`,
        });
        return;
      }

      console.log('Successfully deleted volunteer from database:', deletedData);

      // Verify deletion by attempting to fetch the volunteer
      const { data: verifyData, error: verifyError } = await supabase
        .from('volunteers')
        .select('id')
        .eq('id', volunteerId)
        .maybeSingle();

      if (verifyData) {
        console.error('Volunteer still exists after deletion attempt!');
        toast({
          title: "Deletion Failed",
          description: "The volunteer could not be removed. Please try again.",
          variant: "destructive",
        });
        throw new Error('Deletion verification failed');
      }

      console.log('Deletion verified - volunteer no longer exists in database');

      // Update local state immediately for better UX
      setEvent(prev => {
        if (!prev) return null;
        
        const updatedVolunteers = prev.volunteers?.filter(v => v.id !== volunteerId) || [];
        console.log(`Updated local state - removed volunteer ${volunteerId}. Remaining volunteers:`, updatedVolunteers.length);
        return {
          ...prev,
          volunteers: updatedVolunteers
        };
      });

      toast({
        title: "Volunteer Removed",
        description: `${volunteerName} has been successfully removed from the event.`,
      });

      console.log(`Completed removal of volunteer ${volunteerId}`);
    } catch (error) {
      console.error('Error in removeVolunteer:', error);
      throw error; // Re-throw to let the calling component handle it
    }
  };

  const sendSMS = async (phone: string, name: string, roleLabel: string) => {
    try {
      const message = `Hi ${name}! You're confirmed for ${roleLabel} on ${new Date(event?.start_datetime || '').toLocaleDateString()}. Thanks for volunteering! 📅`;
      
      console.log(`Sending SMS to ${phone}: ${message}`);
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phone,
          message: message
        }
      });

      if (error) {
        console.error('Error sending SMS:', error);
        toast({
          title: "SMS Failed",
          description: "Failed to send confirmation SMS, but signup was successful.",
          variant: "destructive",
        });
        return;
      }

      console.log('SMS sent successfully:', data);
      toast({
        title: "SMS Sent! 📱",
        description: `Confirmation SMS sent to ${phone}`,
      });
    } catch (error) {
      console.error('SMS error:', error);
      toast({
        title: "SMS Failed",
        description: "Failed to send confirmation SMS, but signup was successful.",
        variant: "destructive",
      });
    }
  };

  const handleSignupSubmit = async (volunteerData: {
    name: string;
    phone: string;
    gender: "brother" | "sister";
    notes: string;
  }) => {
    // Prevent duplicate submissions
    if (submissionInProgress.current || isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    // Generate unique submission ID
    const submissionId = Date.now().toString();
    currentSubmissionId.current = submissionId;
    submissionInProgress.current = true;
    setIsSubmitting(true);

    console.log(`Starting signup submission ${submissionId}`);

    try {
      if (!volunteerData.name || !volunteerData.phone) {
        toast({
          title: "Missing Information",
          description: "Please provide your name and phone number.",
          variant: "destructive",
        });
        return;
      }

      if (!selectedRole || !event?.id) {
        return;
      }

      // Check if this submission is still current
      if (currentSubmissionId.current !== submissionId) {
        console.log('Submission cancelled - newer submission started');
        return;
      }

      const remainingForGender = getRemainingSlots(selectedRole, volunteerData.gender);
      if (remainingForGender <= 0) {
        toast({
          title: "Gender Slot Full",
          description: `The ${volunteerData.gender} slots for this role are full. Please try a different role or gender selection.`,
          variant: "destructive",
        });
        return;
      }

      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(volunteerData.phone.replace(/[\s\-\(\)]/g, ''))) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number.",
          variant: "destructive",
        });
        return;
      }

      // Check for existing volunteer with same phone and event to prevent duplicates
      const { data: existingVolunteers, error: checkError } = await supabase
        .from('volunteers')
        .select('id, name, phone')
        .eq('event_id', event.id)
        .eq('phone', volunteerData.phone)
        .eq('role_id', selectedRole.id);

      if (checkError) {
        console.error('Error checking for existing volunteers:', checkError);
      } else if (existingVolunteers && existingVolunteers.length > 0) {
        toast({
          title: "Already Registered",
          description: "This phone number is already registered for this role.",
          variant: "destructive",
        });
        return;
      }

      // Final check if this submission is still current
      if (currentSubmissionId.current !== submissionId) {
        console.log('Submission cancelled before database insert');
        return;
      }

      console.log(`Inserting volunteer data for submission ${submissionId}`);
      const { data: newVolunteer, error } = await supabase
        .from('volunteers')
        .insert({
          event_id: event.id,
          role_id: selectedRole.id,
          name: volunteerData.name,
          phone: volunteerData.phone,
          gender: volunteerData.gender,
          notes: volunteerData.notes,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) {
        console.error('Error signing up:', error);
        toast({
          title: "Signup Failed",
          description: "There was an error signing up. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log(`Successfully inserted volunteer for submission ${submissionId}:`, newVolunteer);

      setEvent(prev => prev ? {
        ...prev,
        volunteers: [...(prev.volunteers || []), newVolunteer as Volunteer]
      } : null);

      setIsModalOpen(false);
      
      toast({
        title: "Successfully Signed Up!",
        description: `You're now registered for ${selectedRole.role_label}.`,
      });

      await sendSMS(volunteerData.phone, volunteerData.name, selectedRole.role_label);

    } catch (error) {
      console.error('Error in signup submission:', error);
      toast({
        title: "Signup Failed",
        description: "There was an error signing up. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Only reset state if this is still the current submission
      if (currentSubmissionId.current === submissionId) {
        submissionInProgress.current = false;
        setIsSubmitting(false);
        currentSubmissionId.current = null;
        console.log(`Completed signup submission ${submissionId}`);
      }
    }
  };

  return {
    event,
    loading,
    eventSlug,
    isModalOpen,
    setIsModalOpen,
    selectedRole,
    isSubmitting,
    getVolunteersForRole,
    getRemainingSlots,
    openSignupModal,
    removeVolunteer,
    handleSignupSubmit
  };
};
