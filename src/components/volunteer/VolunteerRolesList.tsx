
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Copy, Share2 } from "lucide-react";
import { VolunteerRole, Volunteer } from "@/types/database";
import VolunteerTable from "./VolunteerTable";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { displayTimeInMichigan, formatTime24To12 } from "@/utils/timezoneUtils";

interface VolunteerRolesListProps {
  volunteerRoles: VolunteerRole[];
  getVolunteersForRole: (roleId: string) => Volunteer[];
  onSignUp: (role: VolunteerRole) => void;
  onVolunteerDeleted: (volunteerId: string) => void;
  getRemainingSlots: (role: VolunteerRole, gender?: "brother" | "sister") => number;
}



const VolunteerRolesList = ({
  volunteerRoles,
  getVolunteersForRole,
  onSignUp,
  onVolunteerDeleted,
  getRemainingSlots
}: VolunteerRolesListProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const copySignupLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      toast({
        title: "Link Copied! 📋",
        description: "Signup link has been copied to clipboard",
      });
    });
  };

  const shareSignupLink = async () => {
    const currentUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Volunteer Signup',
          text: 'Sign up to volunteer for this event!',
          url: currentUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      copySignupLink();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Volunteer Opportunities</h2>
          <p className="text-white/50">Choose a role and sign up to help make this event successful!</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={copySignupLink}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="border-gold-400/40 text-white/70 hover:bg-white/5"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button
            onClick={shareSignupLink}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="border-gold-400/40 text-white/70 hover:bg-white/5"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {volunteerRoles.map((role) => {
          const volunteers = getVolunteersForRole(role.id);
          const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
          const remainingSlots = getRemainingSlots(role);

          return (
            <Card key={role.id} className="border-white/15 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-foreground text-xl mb-2">{role.role_label}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime24To12(role.shift_start)} - {formatTime24To12(role.shift_end)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{volunteers.length} / {totalSlots} filled</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={remainingSlots > 0 ? "default" : "secondary"}
                      className={remainingSlots > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-foreground"}
                    >
                      {remainingSlots > 0 ? `${remainingSlots} spots left` : "Full"}
                    </Badge>
                    <Button
                      onClick={() => onSignUp(role)}
                      disabled={remainingSlots <= 0}
                      className="bg-gold-400 hover:bg-gold-300 text-navy-900 disabled:bg-white/20"
                      size={isMobile ? "sm" : "default"}
                    >
                      Sign Up
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {volunteers.length > 0 && (
                <CardContent className="pt-0">
                  <VolunteerTable
                    volunteers={volunteers}
                    onVolunteerDeleted={onVolunteerDeleted}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default VolunteerRolesList;
