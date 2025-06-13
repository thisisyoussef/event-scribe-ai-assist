
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { VolunteerRole, Volunteer } from "@/types/database";
import VolunteerRoleCard from "./VolunteerRoleCard";
import { useIsMobile } from "@/hooks/use-mobile";

interface VolunteerRolesListProps {
  volunteerRoles: VolunteerRole[];
  getVolunteersForRole: (roleId: string) => Volunteer[];
  onSignUp: (role: VolunteerRole) => void;
  onRemoveVolunteer: (volunteerId: string, volunteerName: string) => void;
  getRemainingSlots: (role: VolunteerRole, gender?: "brother" | "sister") => number;
}

const VolunteerRolesList = ({
  volunteerRoles,
  getVolunteersForRole,
  onSignUp,
  onRemoveVolunteer,
  getRemainingSlots
}: VolunteerRolesListProps) => {
  const isMobile = useIsMobile();

  return (
    <Card className="border-amber-200 bg-white/90 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-amber-800 text-lg sm:text-xl">Available Volunteer Roles</CardTitle>
        <CardDescription className="text-amber-700 text-sm leading-relaxed">
          Choose a role that fits your schedule and sign up to help make this event successful!
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {volunteerRoles && volunteerRoles.length > 0 ? (
          <div className="space-y-4">
            {volunteerRoles.map((role: VolunteerRole) => {
              const volunteers = getVolunteersForRole(role.id);
              
              return (
                <VolunteerRoleCard
                  key={role.id}
                  role={role}
                  volunteers={volunteers}
                  onSignUp={onSignUp}
                  onRemoveVolunteer={onRemoveVolunteer}
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
  );
};

export default VolunteerRolesList;
