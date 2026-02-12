
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event, VolunteerRole, Volunteer } from "@/types/database";
import { validateEventSlug, sanitizeInput, validatePhoneNumber, validateName, rateLimiter } from "@/utils/securityUtils";

// Function to create URL-friendly slug from event title (primary format)
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

// Function to create a stable slug that won't change when title is edited
const createStableEventSlug = (id: string) => {
  // Use just the last 8 characters of the UUID for a stable, readable identifier
  return `event-${id.slice(-8)}`;
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

// Helper function to check if two time ranges overlap
const checkTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  // Convert time strings (HH:MM) to minutes for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  // Two time ranges overlap if one starts before the other ends
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
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
      
      // Validate the event slug first
      if (!validateEventSlug(eventSlug)) {
        console.error("Invalid event slug format:", eventSlug);
        setEvent(null);
        return;
      }

      // Fetch only public, published, non-deleted events with roles
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*)
        `)
        .eq('status', 'published')
        .eq('is_public', true)
        .is('deleted_at', null);

      if (error) {
        console.error('Error loading events:', error);
        setEvent(null);
        return;
      }

      // Find the event that matches the slug
      let matchingEvent = events?.find(event => {
        // First try to match by title-based slug (new format)
        const eventSlugGenerated = createEventSlug(event.title, event.id);
        if (eventSlugGenerated === eventSlug) {
          return true;
        }
        
        // Then try to match by legacy stable slug (event-xxxxxxxx format) for backward compatibility
        const stableSlug = createStableEventSlug(event.id);
        if (stableSlug === eventSlug) {
          return true;
        }
        
        return false;
      });

      // Fallback: match by unique id suffix for both formats
      if (!matchingEvent && eventSlug) {
        if (eventSlug.startsWith('event-')) {
          // Legacy stable slug format: event-xxxxxxxx
          const suffix = eventSlug.replace('event-', '');
          if (suffix.length === 8) {
            matchingEvent = events?.find(e => e.id.endsWith(suffix));
          }
        } else {
          // Title-based slug format: title-xxxx
          const parts = eventSlug.split('-');
          const suffix = parts[parts.length - 1] || '';
          if (suffix.length === 4) {
            matchingEvent = events?.find(e => e.id.endsWith(suffix));
          }
        }
      }

      if (!matchingEvent) {
        console.log("Event not found for slug (including suffix fallback):", eventSlug);
        setEvent(null);
        return;
      }

      console.log("Found event:", matchingEvent);
      
      // Fetch contact information for POCs
      if (matchingEvent && matchingEvent.volunteer_roles) {
        // Collect all POC IDs from all roles (handling both array and legacy single POC formats)
        const pocIds: string[] = [];
        matchingEvent.volunteer_roles.forEach(role => {
          if (role.suggested_poc) {
            if (Array.isArray(role.suggested_poc)) {
              // New format: array of POC IDs
              pocIds.push(...role.suggested_poc);
            } else {
              // Legacy format: single POC ID
              pocIds.push(role.suggested_poc);
            }
          }
        });
        
        // Remove duplicates and filter out null/undefined values
        const uniquePocIds = [...new Set(pocIds)].filter(id => id);
        
        if (uniquePocIds.length > 0) {
          console.log("Fetching POC contacts for IDs:", uniquePocIds);
          const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('id, name, phone, email')
            .in('id', uniquePocIds);
          
          if (!contactsError && contacts) {
            console.log("Fetched POC contacts:", contacts);
            // Map contact names to the volunteer roles
            matchingEvent.volunteer_roles = matchingEvent.volunteer_roles.map(role => {
              let pocContacts: any[] = [];
              
              if (role.suggested_poc) {
                if (Array.isArray(role.suggested_poc)) {
                  // New format: array of POC IDs
                  pocContacts = role.suggested_poc
                    .map(pocId => contacts.find(contact => contact.id === pocId))
                    .filter(contact => contact); // Remove any undefined contacts
                } else {
                  // Legacy format: single POC ID
                  const contact = contacts.find(contact => contact.id === role.suggested_poc);
                  if (contact) pocContacts = [contact];
                }
              }
              
              return {
                ...role,
                poc_contacts: pocContacts,
                poc_contact: pocContacts[0] // Keep legacy field for backward compatibility
              };
            });
          } else {
            console.error("Error fetching POC contacts:", contactsError);
          }
        }
      }

      // Fetch volunteers separately (confirmed only) to populate counts and local checks
      try {
        const { data: volunteersData, error: volError } = await supabase
          .from('volunteers')
          .select('id, role_id, name, phone, gender, notes, signup_date, status')
          .eq('event_id', (matchingEvent as any).id)
          .eq('status', 'confirmed');

        if (volError) {
          console.error('Error fetching volunteers:', volError);
          (matchingEvent as any).volunteers = [];
        } else {
          (matchingEvent as any).volunteers = volunteersData || [];
        }
      } catch (e) {
        console.error('Unexpected error fetching volunteers:', e);
        (matchingEvent as any).volunteers = [];
      }
      
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
      const specificGenderSlots = gender === 'brother' ? role.slots_brother : role.slots_sister;
      const flexibleSlots = role.slots_flexible || 0;
      
      // Count how many flexible slots are already filled by the other gender
      const otherGender = gender === 'brother' ? 'sister' : 'brother';
      const otherGenderVolunteers = volunteers.filter(v => v.gender === otherGender);
      const otherGenderSlots = otherGender === 'brother' ? role.slots_brother : role.slots_sister;
      const flexibleSlotsUsedByOther = Math.max(0, otherGenderVolunteers.length - otherGenderSlots);
      
      // Available flexible slots for this gender
      const availableFlexibleSlots = Math.max(0, flexibleSlots - flexibleSlotsUsedByOther);
      
      return specificGenderSlots + availableFlexibleSlots - genderVolunteers.length;
    }
    
    const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0) + (role.slots_flexible || 0);
    return totalSlots - volunteers.length;
  };

  const getExistingSignups = async (phone: string): Promise<Array<{role: VolunteerRole, volunteer: Volunteer}>> => {
    if (!event?.id) return [];
    const normalizedPhone = formatPhoneE164(phone);
    const local = (event.volunteers || []).filter(v => v.phone === normalizedPhone);
    const mapped = local.map(v => {
      const role = (event.volunteer_roles || []).find(r => r.id === v.role_id) as VolunteerRole | undefined;
      return role ? { role, volunteer: v } : undefined;
    }).filter(Boolean) as Array<{ role: VolunteerRole, volunteer: Volunteer }>;
    return mapped;
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
  }): Promise<boolean> => {
    const capitalizeWord = (word: string) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "";
    const capitalizeName = (name: string) =>
      name
        .trim()
        .split(/\s+/)
        .map(part =>
          part
            .split('-')
            .map(capitalizeWord)
            .join('-')
        )
        .map(part =>
          part
            .split("'")
            .map(capitalizeWord)
            .join("'")
        )
        .join(' ');

    const normalizedName = capitalizeName(volunteerData.name || "");
    // Prevent duplicate submissions
    if (submissionInProgress.current || isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate request');
      return false;
    }

    // Generate unique submission ID
    const submissionId = Date.now().toString();
    currentSubmissionId.current = submissionId;
    submissionInProgress.current = true;
    setIsSubmitting(true);

    console.log(`Starting signup submission ${submissionId}`);

    try {
      // Validate required fields
      if (!volunteerData.name || !volunteerData.phone) {
        toast({
          title: "Missing Information",
          description: "Please provide your name and phone number.",
          variant: "destructive",
        });
        return false;
      }

      if (!selectedRole || !event?.id) {
        return false;
      }

      // Check if this submission is still current
      if (currentSubmissionId.current !== submissionId) {
        console.log('Submission cancelled - newer submission started');
        return false;
      }

      // Validate and sanitize input
      if (!validateName(volunteerData.name)) {
        toast({
          title: "Invalid Name",
          description: "Please enter a valid name (letters, spaces, hyphens, apostrophes, and periods only).",
          variant: "destructive",
        });
        return false;
      }

      if (!validatePhoneNumber(volunteerData.phone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number in international format.",
          variant: "destructive",
        });
        return false;
      }

      // Sanitize inputs
      const sanitizedName = sanitizeInput(volunteerData.name);
      const sanitizedNotes = sanitizeInput(volunteerData.notes || '');
      const normalizedPhone = formatPhoneE164(volunteerData.phone);

      // Ensure event is actually open for public signup
      if (!event || event.status !== 'published' || event.is_public === false) {
        toast({
          title: "Signup Closed",
          description: "This event is not open for public signups.",
          variant: "destructive",
        });
        return false;
      }

      // Rate limiting check (using phone as identifier)
      const rateLimitKey = `signup_${normalizedPhone}`;
      if (!rateLimiter.isAllowed(rateLimitKey)) {
        toast({
          title: "Too Many Requests",
          description: "Please wait before submitting another signup request.",
          variant: "destructive",
        });
        return false;
      }

      const remainingForGender = getRemainingSlots(selectedRole, volunteerData.gender);
      if (remainingForGender <= 0) {
        toast({
          title: "Gender Slot Full",
          description: `The ${volunteerData.gender} slots for this role are full. Please try a different role or gender selection.`,
          variant: "destructive",
        });
        return false;
      }

      // Use locally loaded volunteers/roles to detect duplicate/overlap without relying on joins
      const existingLocal = (event.volunteers || []).filter(v => v.phone === normalizedPhone);
      if (existingLocal.length > 0) {
        // Same role check
        const sameRoleLocal = existingLocal.some(v => v.role_id === selectedRole.id);
        if (sameRoleLocal) {
          toast({
            title: "Already Registered",
            description: "This phone number is already registered for this role.",
            variant: "destructive",
          });
          return false;
        }

        // Overlap check using local role times
        const selectedStart = selectedRole.shift_start;
        const selectedEnd = selectedRole.shift_end || selectedRole.shift_end_time;
        const localOverlap = existingLocal.some(v => {
          const role = (event.volunteer_roles || []).find(r => r.id === v.role_id);
          if (!role) return false;
          const roleEnd = role.shift_end || role.shift_end_time;
          return checkTimeOverlap(selectedStart, selectedEnd, role.shift_start, roleEnd);
        });

        if (localOverlap) {
          toast({
            title: "Time Conflict",
            description: "You're already signed up for a role that overlaps with this time slot. Please choose a different role or remove your existing signup first.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Check for existing volunteer with same phone and event using local data first
      const existingVolunteers = (event.volunteers || []).filter(v => v.phone === normalizedPhone);
      if (existingVolunteers && existingVolunteers.length > 0) {
        // Check if trying to sign up for the same role
        const sameRole = existingVolunteers.find(v => v.role_id === selectedRole.id);
        if (sameRole) {
          toast({
            title: "Already Registered",
            description: "This phone number is already registered for this role.",
            variant: "destructive",
          });
          return false;
        }

        // Check for time conflicts with existing signups
        const hasTimeConflict = existingVolunteers.some(existingVolunteer => {
          const role = (event.volunteer_roles || []).find(r => r.id === existingVolunteer.role_id);
          if (!role) return false;
          return checkTimeOverlap(
            selectedRole.shift_start,
            selectedRole.shift_end || selectedRole.shift_end_time,
            role.shift_start,
            role.shift_end || role.shift_end_time
          );
        });

        if (hasTimeConflict) {
          toast({
            title: "Time Conflict",
            description: "You're already signed up for a role that overlaps with this time slot. Please choose a different role or remove your existing signup first.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Final check if this submission is still current
      if (currentSubmissionId.current !== submissionId) {
        console.log('Submission cancelled before database insert');
        return false;
      }

      console.log(`Inserting volunteer data for submission ${submissionId} via RPC register_volunteer_public`);
      const { data: newVolunteer, error } = await supabase.rpc('register_volunteer_public', {
        p_event_id: event.id,
        p_role_id: selectedRole.id,
        p_name: normalizedName,
        p_phone: normalizedPhone,
        p_gender: volunteerData.gender,
        p_notes: sanitizedNotes,
      });

      if (error) {
        console.error('Error signing up:', error);
        const msg = (error.message || '').toLowerCase();
        const isRls = msg.includes('permission denied') || msg.includes('violates row-level security') || error.code === '42501';
        toast({
          title: isRls ? "Signup Closed" : "Signup Failed",
          description: isRls ? "This event is not open for public signups." : "There was an error signing up. Please try again.",
          variant: "destructive",
        });
        return false;
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

      await sendSMS(normalizedPhone, normalizedName, selectedRole.role_label);

      return true;

    } catch (error) {
      console.error('Error in signup submission:', error);
      toast({
        title: "Signup Failed",
        description: "There was an error signing up. Please try again.",
        variant: "destructive",
      });
      return false;
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
    getExistingSignups,
    openSignupModal,
    handleSignupSubmit,
    updateLocalVolunteers
  };
};
