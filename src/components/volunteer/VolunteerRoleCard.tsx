
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import { VolunteerRole, Volunteer } from "@/types/database";
import VolunteerTable from "./VolunteerTable";
import { useIsMobile } from "@/hooks/use-mobile";

interface VolunteerRoleCardProps {
  role: VolunteerRole;
  volunteers: Volunteer[];
  onSignUp: (role: VolunteerRole) => void;
  onRemoveVolunteer: (volunteerId: string, volunteerName: string) => void;
  getRemainingSlots: (role: VolunteerRole, gender?: "brother" | "sister") => number;
}

const VolunteerRoleCard = ({ 
  role, 
  volunteers, 
  onSignUp, 
  onRemoveVolunteer, 
  getRemainingSlots 
}: VolunteerRoleCardProps) => {
  const isMobile = useIsMobile();
  const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
  const remainingSlots = getRemainingSlots(role);
  const brotherSlots = getRemainingSlots(role, 'brother');
  const sisterSlots = getRemainingSlots(role, 'sister');

  return (
    <Card className={`${remainingSlots === 0 ? 'opacity-75' : ''} border-amber-200 bg-white/80`}>
      <CardContent className="p-4 sm:p-6">
        <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-start'} mb-4`}>
          <div className="flex-1">
            <div className="mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-amber-800 mb-2">{role.role_label}</h3>
              <div className={`flex flex-wrap gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <Badge variant={remainingSlots > 0 ? "default" : "secondary"} className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  {remainingSlots > 0 ? `${remainingSlots} open` : "Full"}
                </Badge>
                <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">
                  Brothers: {brotherSlots}/{role.slots_brother}
                </Badge>
                <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">
                  Sisters: {sisterSlots}/{role.slots_sister}
                </Badge>
              </div>
            </div>
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'md:grid-cols-2 gap-4'} text-xs sm:text-sm text-amber-600`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{role.shift_start} - {role.shift_end}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{volunteers.length} / {totalSlots} volunteers</span>
                </div>
              </div>
            </div>
            
            {role.notes && (
              <div className="text-xs sm:text-sm text-amber-600 mt-2 italic">
                {role.notes}
              </div>
            )}
          </div>
          
          <div className={`${isMobile ? 'w-full' : 'ml-6 flex-shrink-0'}`}>
            <Button
              onClick={() => onSignUp(role)}
              disabled={remainingSlots === 0}
              className={`bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'w-full text-sm py-2' : ''}`}
            >
              {remainingSlots === 0 ? "Full" : "Sign Up"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <VolunteerTable 
            volunteers={volunteers} 
            onRemoveVolunteer={onRemoveVolunteer} 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default VolunteerRoleCard;
