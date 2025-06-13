
import { useState, useEffect } from "react";
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

  const removeVolunteer = async (volunteerId: string, volunteerName: string) => {
    try {
      const { error } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', volunteerId);

      if (error) {
        console.error('Error removing volunteer:', error);
        toast({
          title: "Error",
          description: "Failed to remove from event.",
          variant: "destructive",
        });
        return;
      }

      setEvent(prev => prev ? {
        ...prev,
        volunteers: prev.volunteers?.filter(v => v.id !== volunteerId) || []
      } : null);

      toast({
        title: "Successfully Removed",
        description: `${volunteerName} has been removed from the event.`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
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
    setIsSubmitting(true);

    if (!volunteerData.name || !volunteerData.phone) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and phone number.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (!selectedRole || !event?.id) {
      setIsSubmitting(false);
      return;
    }

    const remainingForGender = getRemainingSlots(selectedRole, volunteerData.gender);
    if (remainingForGender <= 0) {
      toast({
        title: "Gender Slot Full",
        description: `The ${volunteerData.gender} slots for this role are full. Please try a different role or gender selection.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(volunteerData.phone.replace(/[\s\-\(\)]/g, ''))) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
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
        setIsSubmitting(false);
        return;
      }

      setEvent(prev => prev ? {
        ...prev,
        volunteers: [...(prev.volunteers || []), newVolunteer as Volunteer]
      } : null);

      setIsSubmitting(false);
      setIsModalOpen(false);
      
      toast({
        title: "Successfully Signed Up!",
        description: `You're now registered for ${selectedRole.role_label}.`,
      });

      await sendSMS(volunteerData.phone, volunteerData.name, selectedRole.role_label);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Signup Failed",
        description: "There was an error signing up. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
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
