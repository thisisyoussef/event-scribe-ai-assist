
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { VolunteerRole, Event } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import ConfirmationDialog from "./ConfirmationDialog";
import AddToCalendar from "./AddToCalendar";

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCalendarSuccess, setShowCalendarSuccess] = useState(false);
  const [volunteerData, setVolunteerData] = useState({
    name: "",
    phone: "",
    gender: "brother" as "brother" | "sister",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmSignup = () => {
    setShowConfirmation(false);
    onSubmit(volunteerData);
    setShowCalendarSuccess(true);
  };

  const handleClose = () => {
    setVolunteerData({ name: "", phone: "", gender: "brother", notes: "" });
    setShowConfirmation(false);
    setShowCalendarSuccess(false);
    onClose();
  };

  const handleSuccessClose = () => {
    setShowCalendarSuccess(false);
    handleClose();
  };

  if (showCalendarSuccess && selectedRole && event) {
    return (
      <Dialog open={showCalendarSuccess} onOpenChange={handleSuccessClose}>
        <DialogContent className={`
          border-2 border-green-300 bg-white/95 backdrop-blur-lg shadow-2xl
          ${isMobile 
            ? 'w-[92vw] max-w-[92vw] max-h-[88vh] mx-auto p-5 rounded-3xl' 
            : 'max-w-lg w-full max-h-[90vh] rounded-2xl p-6'
          }
        `}>
          <DialogHeader className="text-center">
            <DialogTitle className="text-green-800 text-xl flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Registration Successful!
            </DialogTitle>
            <DialogDescription className="text-green-700 mt-4">
              You've been successfully registered for {selectedRole.role_label}. 
              A confirmation SMS has been sent to your phone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 mt-6">
            <AddToCalendar 
              event={event} 
              role={selectedRole}
              className="w-full justify-center"
            />
            
            <Button 
              onClick={handleSuccessClose}
              className="bg-umma-500 hover:bg-umma-600 text-white w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`
          border-2 border-umma-300 bg-white/95 backdrop-blur-lg shadow-2xl
          ${isMobile 
            ? 'w-[92vw] max-w-[92vw] max-h-[88vh] mx-auto p-5 rounded-3xl' 
            : 'max-w-lg w-full max-h-[90vh] rounded-2xl p-6'
          }
          overflow-hidden flex flex-col
        `}>
          <DialogHeader className="text-left pb-2 flex-shrink-0">
            <DialogTitle className="text-umma-800 text-lg sm:text-xl">
              Sign Up for {selectedRole?.role_label}
            </DialogTitle>
            <DialogDescription className="text-umma-700 text-sm">
              Fill in your information to register for this volunteer role.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
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
                  className="border-umma-200 focus:border-umma-400 text-base rounded-xl"
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
                  className="border-umma-200 focus:border-umma-400 text-base rounded-xl"
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
                  <SelectTrigger className="border-umma-200 text-base rounded-xl">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brother">Brother</SelectItem>
                    <SelectItem value="sister">Sister</SelectItem>
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <div className="text-xs text-umma-600 bg-umma-50 p-3 rounded-xl border border-umma-200">
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
                  className="border-umma-200 focus:border-umma-400 text-base resize-none rounded-xl"
                />
              </div>

              {selectedRole && (
                <div className="bg-umma-50 p-4 rounded-xl border border-umma-200">
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

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-umma-200 flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="border-umma-300 text-umma-700 hover:bg-umma-50 order-2 sm:order-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-umma-500 hover:bg-umma-600 text-white order-1 sm:order-2 rounded-xl shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Sign Me Up!
                </Button>
              </div>
            </form>
          </div>

          {/* Scroll indicator for mobile */}
          {isMobile && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 animate-bounce">
              <ChevronDown className="w-5 h-5 text-umma-400" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedRole && event && (
        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSignup}
          role={selectedRole}
          event={event}
          volunteerData={volunteerData}
        />
      )}
    </>
  );
};

export default SignupModal;
