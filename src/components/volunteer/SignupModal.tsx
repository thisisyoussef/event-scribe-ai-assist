
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { VolunteerRole, Event } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: VolunteerRole | null;
  event: Event | null;
  onSubmit: (volunteerData: {
    name: string;
    phone: string;
    gender: "brother" | "sister";
    notes: string;
  }) => void;
  getRemainingSlots: (role: VolunteerRole, gender?: "brother" | "sister") => number;
  isSubmitting: boolean;
}

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const SignupModal = ({
  isOpen,
  onClose,
  selectedRole,
  event,
  onSubmit,
  getRemainingSlots,
  isSubmitting
}: SignupModalProps) => {
  const isMobile = useIsMobile();
  const [volunteerData, setVolunteerData] = useState({
    name: "",
    phone: "",
    gender: "brother" as "brother" | "sister",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(volunteerData);
  };

  const handleClose = () => {
    setVolunteerData({ name: "", phone: "", gender: "brother", notes: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`
        border-umma-200 bg-white/95 backdrop-blur-sm
        ${isMobile 
          ? 'w-[90vw] max-w-[90vw] max-h-[85vh] mx-auto p-4 overflow-y-auto' 
          : 'max-w-lg w-full max-h-[90vh] overflow-y-auto'
        }
      `}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-umma-800 text-lg sm:text-xl">
            Sign Up for {selectedRole?.role_label}
          </DialogTitle>
          <DialogDescription className="text-umma-700 text-sm">
            Fill in your information to register for this volunteer role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-umma-800 text-sm font-medium">Full Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your full name"
              value={volunteerData.name}
              onChange={(e) => setVolunteerData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="border-umma-200 focus:border-umma-400 text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-umma-800 text-sm font-medium">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={volunteerData.phone}
              onChange={(e) => setVolunteerData(prev => ({ ...prev, phone: e.target.value }))}
              required
              className="border-umma-200 focus:border-umma-400 text-base"
            />
            <div className="text-xs text-umma-600">
              Used for event reminders and communication
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender" className="text-umma-800 text-sm font-medium">Gender *</Label>
            <Select 
              value={volunteerData.gender} 
              onValueChange={(value: "brother" | "sister") => setVolunteerData(prev => ({ ...prev, gender: value }))}
            >
              <SelectTrigger className="border-umma-200 text-base">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brother">Brother</SelectItem>
                <SelectItem value="sister">Sister</SelectItem>
              </SelectContent>
            </Select>
            {selectedRole && (
              <div className="text-xs text-umma-600 bg-umma-50 p-2 rounded">
                <div className="flex flex-col sm:flex-row sm:gap-4 gap-1">
                  <span>Brothers: {getRemainingSlots(selectedRole, 'brother')}/{selectedRole.slots_brother}</span>
                  <span>Sisters: {getRemainingSlots(selectedRole, 'sister')}/{selectedRole.slots_sister}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-umma-800 text-sm font-medium">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements, questions, or information..."
              value={volunteerData.notes}
              onChange={(e) => setVolunteerData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="border-umma-200 focus:border-umma-400 text-base resize-none"
            />
          </div>

          {selectedRole && (
            <div className="bg-umma-50 p-3 rounded-lg border border-umma-200">
              <h4 className="font-medium mb-2 text-umma-800 text-sm">Role Details:</h4>
              <div className="text-xs text-umma-700 space-y-1">
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <div><strong>Time:</strong> {formatTime(selectedRole.shift_start)} - {formatTime(selectedRole.shift_end)}</div>
                  <div><strong>Date:</strong> {new Date(event?.start_datetime || '').toLocaleDateString()}</div>
                </div>
                <div><strong>Location:</strong> {event?.location}</div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-umma-300 text-umma-700 hover:bg-umma-50 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-umma-500 hover:bg-umma-600 text-white order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Signing Up...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Sign Me Up!
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
