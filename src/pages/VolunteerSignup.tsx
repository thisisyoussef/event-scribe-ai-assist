
import EventHeader from "@/components/volunteer/EventHeader";
import SignupModal from "@/components/volunteer/SignupModal";
import LoadingState from "@/components/volunteer/LoadingState";
import EventNotFound from "@/components/volunteer/EventNotFound";
import VolunteerRolesList from "@/components/volunteer/VolunteerRolesList";
import SignupPageMeta from "@/components/volunteer/SignupPageMeta";
import { useVolunteerSignup } from "@/hooks/useVolunteerSignup";
import { useIsMobile } from "@/hooks/use-mobile";

const VolunteerSignup = () => {
  const isMobile = useIsMobile();
  const {
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
  } = useVolunteerSignup();

  // Create wrapper function that matches the expected signature
  const handleVolunteerDeleted = (volunteerId: string) => {
    // Find the volunteer to get their name
    const volunteer = event?.volunteers?.find(v => v.id === volunteerId);
    if (volunteer) {
      removeVolunteer(volunteerId, volunteer.name);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!event) {
    return <EventNotFound eventId={eventSlug} />;
  }

  return (
    <>
      <SignupPageMeta event={event} />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
        <EventHeader event={event} />

        <main className={`container mx-auto px-4 py-6 ${isMobile ? 'max-w-full' : 'max-w-6xl'}`}>
          <VolunteerRolesList
            volunteerRoles={event.volunteer_roles || []}
            getVolunteersForRole={getVolunteersForRole}
            onSignUp={openSignupModal}
            onVolunteerDeleted={handleVolunteerDeleted}
            getRemainingSlots={getRemainingSlots}
          />

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
    </>
  );
};

export default VolunteerSignup;
