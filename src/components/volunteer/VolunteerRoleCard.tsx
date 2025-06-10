
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import { VolunteerRole, Volunteer } from "@/types/database";
import VolunteerTable from "./VolunteerTable";

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
  const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
  const remainingSlots = getRemainingSlots(role);
  const brotherSlots = getRemainingSlots(role, 'brother');
  const sisterSlots = getRemainingSlots(role, 'sister');

  return (
    <Card className={`${remainingSlots === 0 ? 'opacity-75' : ''} border-amber-200 bg-white/80`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h3 className="text-lg font-semibold text-amber-800">{role.role_label}</h3>
              <div className="flex space-x-2">
                <Badge variant={remainingSlots > 0 ? "default" : "secondary"} className="bg-amber-100 text-amber-700 border-amber-200">
                  {remainingSlots > 0 ? `${remainingSlots} total open` : "Full"}
                </Badge>
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  Brothers: {brotherSlots}/{role.slots_brother}
                </Badge>
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  Sisters: {sisterSlots}/{role.slots_sister}
                </Badge>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-600">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{role.shift_start} - {role.shift_end}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{volunteers.length} / {totalSlots} volunteers signed up</span>
                </div>
              </div>
            </div>
            
            {role.notes && (
              <div className="text-sm text-amber-600 mt-3 italic">
                {role.notes}
              </div>
            )}
          </div>
          
          <div className="ml-6">
            <Button
              onClick={() => onSignUp(role)}
              disabled={remainingSlots === 0}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {remainingSlots === 0 ? "Full" : "Sign Up"}
            </Button>
          </div>
        </div>

        <VolunteerTable 
          volunteers={volunteers} 
          onRemoveVolunteer={onRemoveVolunteer} 
        />
      </CardContent>
    </Card>
  );
};

export default VolunteerRoleCard;
