
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { VolunteerRole, Event, Volunteer } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import ConfirmationDialog from "./ConfirmationDialog";
import AddToCalendar from "./AddToCalendar";
import { useToast } from "@/hooks/use-toast";
import { formatTime24To12 } from "@/utils/timezoneUtils";

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
  }) => Promise<boolean>;
  getRemainingSlots: (role: VolunteerRole, gender?: "brother" | "sister") => number;
  getExistingSignups: (phone: string) => Promise<Array<{role: VolunteerRole, volunteer: Volunteer}>>;
  isSubmitting: boolean;
}



const SignupModal = ({
  isOpen,
  onClose,
  selectedRole,
  event,
  onSubmit,
  getRemainingSlots,
  getExistingSignups,
  isSubmitting
}: SignupModalProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCalendarSuccess, setShowCalendarSuccess] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [volunteerData, setVolunteerData] = useState({
    name: "",
    phone: "",
    gender: undefined as "brother" | "sister" | undefined,
    notes: ""
  });
  const [existingSignups, setExistingSignups] = useState<Array<{role: VolunteerRole, volunteer: Volunteer}>>([]);
  const [checkingExistingSignups, setCheckingExistingSignups] = useState(false);

  // Check for existing signups when phone number changes
  const checkExistingSignups = async (phone: string) => {
    const digits = (phone || "").replace(/\D/g, "");
    // Skip until we have a reasonable minimum of digits
    if (!digits || digits.length < 7) {
      setExistingSignups([]);
      return;
    }

    setCheckingExistingSignups(true);
    try {
      const signups = await getExistingSignups(phone);
      setExistingSignups(signups);
    } catch (error) {
      console.error('Error checking existing signups:', error);
      setExistingSignups([]);
    } finally {
      setCheckingExistingSignups(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your first and last name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!volunteerData.phone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }
    
    if (!volunteerData.gender) {
      toast({
        title: "Missing Information",
        description: "Please select your gender (Brother or Sister).",
        variant: "destructive",
      });
      return;
    }
    
    // Combine first and last name into the volunteer data for confirmation
    const combinedName = `${firstName} ${lastName}`.trim();
    setVolunteerData(prev => ({ ...prev, name: combinedName }));
    setShowConfirmation(true);
  };

  const handleConfirmSignup = () => {
    setShowConfirmation(false);
    const fullName = `${firstName} ${lastName}`.trim();
    onSubmit({ ...volunteerData, name: fullName })
      .then((success) => {
        if (success) {
          setShowCalendarSuccess(true);
        }
      });
  };

  const handleClose = () => {
    setVolunteerData({ name: "", phone: "", gender: undefined, notes: "" });
    setFirstName("");
    setLastName("");
    setShowConfirmation(false);
    setShowCalendarSuccess(false);
    onClose();
  };

  const handleSuccessClose = () => {
    setShowCalendarSuccess(false);
    handleClose();
  };

  // Reset form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setVolunteerData({ name: "", phone: "", gender: undefined, notes: "" });
      setFirstName("");
      setLastName("");
    }
  }, [isOpen]);

  // No auto-selection - user must choose gender

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
            <DialogDescription className="text-emerald-300 mt-4">
              You've been successfully registered for {selectedRole.role_label}. 
              A confirmation SMS has been sent to your phone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 mt-6">
            <AddToCalendar 
              event={event} 
              role={selectedRole}
              className="w-full justify-center"
              showText={true}
            />
            
            <Button 
              onClick={handleSuccessClose}
              className="bg-gold-400 hover:bg-gold-300 text-white w-full"
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
          border-2 border-gold-400 bg-white/95 backdrop-blur-lg shadow-2xl
          ${isMobile 
            ? 'w-[92vw] max-w-[92vw] max-h-[88vh] mx-auto p-5 rounded-3xl' 
            : 'max-w-lg w-full max-h-[90vh] rounded-2xl p-6'
          }
          overflow-hidden flex flex-col
        `}>
          <DialogHeader className="text-left pb-2 flex-shrink-0">
            <DialogTitle className="text-foreground text-lg sm:text-xl">
              Sign Up for {selectedRole?.role_label}
            </DialogTitle>
            <DialogDescription className="text-gold-300 text-sm">
              Fill in your information to register for this volunteer role.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first-name" className="text-foreground text-sm font-medium">First Name *</Label>
                    <Input
                      id="first-name"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="border-white/10 focus:border-gold-400/50 text-base rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name" className="text-foreground text-sm font-medium">Last Name *</Label>
                    <Input
                      id="last-name"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="border-white/10 focus:border-gold-400/50 text-base rounded-xl"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground text-sm font-medium">Phone Number *</Label>
                <PhoneInput
                  id="phone"
                  value={volunteerData.phone}
                  onChange={(newPhone) => {
                    setVolunteerData(prev => ({ ...prev, phone: newPhone }));
                    setTimeout(() => checkExistingSignups(newPhone), 500);
                  }}
                  placeholder="Phone number"
                  className="border-white/10 focus:border-gold-400/50 text-base rounded-xl"
                />
                <div className="text-xs text-gold-400">
                  Used for event reminders and communication
                </div>
                
                {/* Existing Signups Display */}
                {checkingExistingSignups && (
                  <div className="text-xs text-gold-400 bg-gold-400/10 p-2 rounded-lg">
                    Checking for existing signups...
                  </div>
                )}
                
                {existingSignups.length > 0 && !checkingExistingSignups && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-800 mb-2">
                      You're already signed up for:
                    </div>
                    <div className="space-y-2">
                      {existingSignups.map((signup, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-blue-100">
                          <div>
                            <div className="text-sm font-medium text-blue-900">
                              {signup.role.role_label}
                            </div>
                            <div className="text-xs text-blue-700">
                              {formatTime24To12(signup.role.shift_start)} - {formatTime24To12(signup.role.shift_end)}
                            </div>
                          </div>
                          <div className="text-xs text-blue-600 capitalize">
                            {signup.volunteer.gender}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-blue-700 mt-2">
                      You can sign up for additional roles as long as the times don't overlap.
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-foreground text-sm font-medium">Gender *</Label>
                <Select 
                  value={volunteerData.gender || undefined} 
                  onValueChange={(value: "brother" | "sister") => setVolunteerData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger className="border-white/10 text-base rounded-xl">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {(((selectedRole?.slots_brother || 0) > 0) || ((selectedRole?.slots_flexible || 0) > 0)) && (
                      <SelectItem value="brother">Brother</SelectItem>
                    )}
                    {(((selectedRole?.slots_sister || 0) > 0) || ((selectedRole?.slots_flexible || 0) > 0)) && (
                      <SelectItem value="sister">Sister</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <div className="text-xs text-gold-400 bg-gold-400/10 p-3 rounded-xl border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:gap-4 gap-1">
                      <span>Brothers: {getRemainingSlots(selectedRole, 'brother')}/{selectedRole.slots_brother + (selectedRole.slots_flexible || 0)}</span>
                      <span>Sisters: {getRemainingSlots(selectedRole, 'sister')}/{selectedRole.slots_sister + (selectedRole.slots_flexible || 0)}</span>
                      {(selectedRole.slots_flexible || 0) > 0 && (
                        <span>Flexible: {selectedRole.slots_flexible} (either gender)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground text-sm font-medium">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requirements, questions, or information..."
                  value={volunteerData.notes}
                  onChange={(e) => setVolunteerData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="border-white/10 focus:border-gold-400/50 text-base resize-none rounded-xl"
                />
              </div>

              {selectedRole && (
                <div className="bg-gold-400/10 p-4 rounded-xl border border-white/10">
                  <h4 className="font-medium mb-2 text-foreground text-sm">Role Details:</h4>
                  <div className="text-xs text-gold-300 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:gap-4">
                      <div><strong>Time:</strong> {formatTime24To12(selectedRole.shift_start)} - {formatTime24To12(selectedRole.shift_end)}</div>
                      <div><strong>Date:</strong> {new Date(event?.start_datetime || '').toLocaleDateString()}</div>
                    </div>
                    <div><strong>Location:</strong> {event?.location}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10 flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="border-gold-400 text-gold-300 hover:bg-gold-400/10 order-2 sm:order-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gold-400 hover:bg-gold-300 text-white order-1 sm:order-2 rounded-xl shadow-lg"
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
              <ChevronDown className="w-5 h-5 text-white/30" />
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
          volunteerData={{ ...volunteerData, name: `${firstName} ${lastName}`.trim() }}
        />
      )}
    </>
  );
};

export default SignupModal;
