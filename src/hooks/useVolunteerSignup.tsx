
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

// Normalize a phone number to E.164 (+15551234567)
// - Removes spaces, dashes, parentheses
// - Adds +1 for 10-digit US numbers
const formatPhoneE164 = (input: string) => {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    return digits;
  }
  // If starts with 1 and 11 digits, prefix +
  if (/^1\d{10}$/.test(digits)) {
    return `+${digits}`;
  }
  // If 10 digits, assume US and prefix +1
  if (/^\d{10}$/.test(digits)) {
    return `+1${digits}`;
  }
  return `+${digits}`; // fallback: prefix +
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

      // Find the event that matches the slug (support legacy links if title changed)
      let matchingEvent = events?.find(event => {
        const eventSlugGenerated = createEventSlug(event.title, event.id);
        return eventSlugGenerated === eventSlug;
      });

      // Fallback: match by unique id suffix (last 4 chars) to survive title edits
      if (!matchingEvent && eventSlug) {
        const parts = eventSlug.split('-');
        const suffix = parts[parts.length - 1] || '';
        if (suffix.length === 4) {
          matchingEvent = events?.find(e => e.id.endsWith(suffix));
        }
      }

      if (!matchingEvent) {
        console.log("Event not found for slug (including suffix fallback):", eventSlug);
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

  // Function to update local volunteers state (used after successful deletion)
  const updateLocalVolunteers = (volunteerId: string) => {
    setEvent(prev => {
      if (!prev) return null;
      
      const updatedVolunteers = prev.volunteers?.filter(v => v.id !== volunteerId) || [];
      console.log(`[SIGNUP] Updated local state - removed volunteer ${volunteerId} from UI`);
      return {
        ...prev,
        volunteers: updatedVolunteers
      };
    });
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

      const normalizedPhone = formatPhoneE164(volunteerData.phone);
      const phoneRegex = /^\+[1-9]\d{7,14}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number in international format.",
          variant: "destructive",
        });
        return;
      }

      // Check for existing volunteer with same phone and event to prevent duplicates
      const { data: existingVolunteers, error: checkError } = await supabase
        .from('volunteers')
        .select('id, name, phone')
        .eq('event_id', event.id)
        .eq('phone', normalizedPhone)
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
          phone: normalizedPhone,
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

      // Automatically add volunteer contact to contacts table for the event organizer
      try {
        if (event.created_by) {
          // Check if a contact with this phone number already exists for this user
          const { data: existingContact, error: checkContactError } = await supabase
            .from('contacts')
            .select('id, name, source')
            .eq('user_id', event.created_by)
            .eq('phone', normalizedPhone)
            .single();

          if (checkContactError && checkContactError.code !== 'PGRST116') {
            // PGRST116 means no rows returned, which is expected if no existing contact
            console.error('Error checking for existing contact:', checkContactError);
          }

          if (existingContact) {
            // Contact already exists, update it with volunteer signup info if it's not already from a signup
            if (existingContact.source !== 'volunteer_signup') {
              const { error: updateError } = await supabase
                .from('contacts')
                .update({
                  source: 'volunteer_signup',
                  event_id: event.id,
                  role_id: selectedRole.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingContact.id);

              if (updateError) {
                console.error('Error updating existing contact:', updateError);
              } else {
                console.log('Updated existing contact with volunteer signup information');
              }
            } else {
              // Contact is already from a volunteer signup, just update the event/role info
              const { error: updateError } = await supabase
                .from('contacts')
                .update({
                  event_id: event.id,
                  role_id: selectedRole.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingContact.id);

              if (updateError) {
                console.error('Error updating existing contact event info:', updateError);
              } else {
                console.log('Updated existing volunteer contact with new event information');
              }
            }
          } else {
            // No existing contact, create a new one
            const { error: contactError } = await supabase
              .from('contacts')
              .insert({
                user_id: event.created_by,
                name: volunteerData.name,
                phone: normalizedPhone,
                source: 'volunteer_signup',
                event_id: event.id,
                role_id: selectedRole.id
              });

            if (contactError) {
              console.error('Error adding contact:', contactError);
            } else {
              console.log('Successfully added new volunteer contact to contacts table');
            }
          }
        }
      } catch (contactError) {
        console.error('Error in contact creation/update:', contactError);
        // Don't fail the signup if contact creation fails
      }

      setEvent(prev => prev ? {
        ...prev,
        volunteers: [...(prev.volunteers || []), newVolunteer as Volunteer]
      } : null);

      setIsModalOpen(false);
      
      toast({
        title: "Successfully Signed Up!",
        description: `You're now registered for ${selectedRole.role_label}.`,
      });

      await sendSMS(normalizedPhone, volunteerData.name, selectedRole.role_label);

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
    handleSignupSubmit,
    updateLocalVolunteers
  };
};
