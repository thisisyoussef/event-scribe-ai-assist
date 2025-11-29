
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import { VolunteerRole, Volunteer } from "@/types/database";
import VolunteerTable from "./VolunteerTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { displayTimeInMichigan } from "@/utils/timezoneUtils";

interface VolunteerRoleCardProps {
  role: VolunteerRole;
  volunteers: Volunteer[];
  onSignUp: (role: VolunteerRole) => void;
  onVolunteerDeleted: (volunteerId: string) => void;
  getRemainingSlots: (role: VolunteerRole, gender?: "brother" | "sister") => number;
}

const formatTime = (time: string) => {
  // Since shift_start and shift_end are now TIME fields (HH:MM), 
  // we can format them directly without timezone conversion
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Detroit'
  });
};

const VolunteerRoleCard = ({ 
  role, 
  volunteers, 
  onSignUp, 
  onVolunteerDeleted, 
  getRemainingSlots 
}: VolunteerRoleCardProps) => {
  const isMobile = useIsMobile();
  const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
  const remainingSlots = getRemainingSlots(role);
  const brotherSlots = getRemainingSlots(role, 'brother');
  const sisterSlots = getRemainingSlots(role, 'sister');

  return (
    <Card className={`${remainingSlots === 0 ? 'opacity-75' : ''} border-umma-200 bg-white/80`}>
      <CardContent className={`${isMobile ? 'p-3' : 'p-4 sm:p-6'}`}>
        <div className={`${isMobile ? 'space-y-3' : 'flex justify-between items-start'} mb-4`}>
          <div className="flex-1">
            <div className="mb-3">
              <h3 className={`${isMobile ? 'text-sm' : 'text-base sm:text-lg'} font-semibold text-umma-800 mb-2`}>{role.role_label}</h3>
              <div className={`flex flex-wrap gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <Badge variant={remainingSlots > 0 ? "default" : "secondary"} className="bg-umma-100 text-umma-700 border-umma-200 text-xs">
                  {remainingSlots > 0 ? `${remainingSlots} open` : "Full"}
                </Badge>
                <Badge variant="outline" className="border-umma-300 text-umma-700 text-xs">
                  Brothers: {brotherSlots}/{role.slots_brother}
                </Badge>
                <Badge variant="outline" className="border-umma-300 text-umma-700 text-xs">
                  Sisters: {sisterSlots}/{role.slots_sister}
                </Badge>
              </div>
            </div>
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-1' : 'md:grid-cols-2 gap-4'} text-xs sm:text-sm text-umma-600`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{formatTime(role.shift_start)} - {formatTime(role.shift_end)}</span>
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
              <div className="text-xs sm:text-sm text-umma-600 mt-2 italic">
                {role.notes}
              </div>
            )}
          </div>
          
          <div className={`${isMobile ? 'w-full' : 'ml-6 flex-shrink-0'}`}>
            <Button
              onClick={() => onSignUp(role)}
              disabled={remainingSlots === 0}
              className={`bg-umma-500 hover:bg-umma-600 text-white disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'w-full text-sm py-2' : ''}`}
            >
              {remainingSlots === 0 ? "Full" : "Sign Up"}
            </Button>
          </div>
        </div>

        <VolunteerTable 
          volunteers={volunteers} 
          onVolunteerDeleted={onVolunteerDeleted} 
        />
      </CardContent>
    </Card>
  );
};

export default VolunteerRoleCard;
