
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event, VolunteerRole, Volunteer } from "@/types/database";
import EventHeader from "@/components/volunteer/EventHeader";
import VolunteerRoleCard from "@/components/volunteer/VolunteerRoleCard";
import SignupModal from "@/components/volunteer/SignupModal";
import { useIsMobile } from "@/hooks/use-mobile";

const VolunteerSignup = () => {
  const { eventId } = useParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [event, setEvent] = useState<(Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;
    
    try {
      console.log("Loading event with ID:", eventId);
      
      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
        .eq('id', eventId)
        .eq('status', 'published')
        .single();

      if (error) {
        console.error('Error loading event:', error);
        if (error.code === 'PGRST116') {
          console.log("Event not found or not published");
        }
        setEvent(null);
        return;
      }

      console.log("Found event:", eventData);
      setEvent(eventData as Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] });
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

    if (!selectedRole || !eventId) {
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
          event_id: eventId,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-amber-700">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-amber-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-amber-800">Event Not Found</h2>
            <div className="text-amber-600">
              The event you're looking for doesn't exist, isn't published yet, or has been removed.
            </div>
            <div className="text-sm text-amber-500 mt-2">
              Event ID: {eventId}
            </div>
            <div className="text-xs text-amber-400 mt-4">
              Only published events are available for volunteer signup.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <EventHeader event={event} />

      <main className={`container mx-auto ${isMobile ? 'px-2' : 'px-4'} py-6`}>
        {event.description && (
          <Card className={`mb-6 border-amber-200 bg-white/90 backdrop-blur-sm ${isMobile ? 'p-0' : ''}`}>
            <CardHeader className={isMobile ? 'p-4' : ''}>
              <CardTitle className="text-amber-800">About This Event</CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? 'p-4 pt-0' : ''}>
              <div className="text-amber-700 text-sm md:text-base">{event.description}</div>
            </CardContent>
          </Card>
        )}

        <Card className={`border-amber-200 bg-white/90 backdrop-blur-sm shadow-xl ${isMobile ? 'p-0' : ''}`}>
          <CardHeader className={isMobile ? 'p-4' : ''}>
            <CardTitle className="text-amber-800 text-lg md:text-xl">Available Volunteer Roles</CardTitle>
            <CardDescription className="text-amber-700 text-xs md:text-sm">
              Choose a role that fits your schedule and sign up to help make this event successful!
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4 pt-0' : ''}>
            {event.volunteer_roles && event.volunteer_roles.length > 0 ? (
              <div className="space-y-4 md:space-y-6">
                {event.volunteer_roles.map((role: VolunteerRole) => {
                  const volunteers = getVolunteersForRole(role.id);
                  
                  return (
                    <VolunteerRoleCard
                      key={role.id}
                      role={role}
                      volunteers={volunteers}
                      onSignUp={openSignupModal}
                      onRemoveVolunteer={removeVolunteer}
                      getRemainingSlots={getRemainingSlots}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-amber-800 mb-2">No Roles Available</h3>
                <div className="text-amber-600 text-sm">Volunteer roles for this event haven't been set up yet.</div>
              </div>
            )}
          </CardContent>
        </Card>

        <SignupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedRole={selectedRole}
          event={event}
          onSubmit={handleSignupSubmit}
          getRemainingSlots={getRemainingSlots}
          isSubmitting={isSubmitting}
        />
      </main>
    </div>
  );
};

export default VolunteerSignup;
