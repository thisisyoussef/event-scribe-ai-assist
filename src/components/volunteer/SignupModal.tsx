
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { VolunteerRole, Event } from "@/types/database";

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

const SignupModal = ({
  isOpen,
  onClose,
  selectedRole,
  event,
  onSubmit,
  getRemainingSlots,
  isSubmitting
}: SignupModalProps) => {
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
      <DialogContent className="border-amber-200 bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-amber-800">Sign Up for {selectedRole?.role_label}</DialogTitle>
          <DialogDescription className="text-amber-700">
            Fill in your information to register for this volunteer role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-amber-800">Full Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your full name"
              value={volunteerData.name}
              onChange={(e) => setVolunteerData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="border-amber-200 focus:border-amber-400"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-amber-800">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={volunteerData.phone}
              onChange={(e) => setVolunteerData(prev => ({ ...prev, phone: e.target.value }))}
              required
              className="border-amber-200 focus:border-amber-400"
            />
            <div className="text-xs text-amber-600">
              Used for event reminders and communication
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender" className="text-amber-800">Gender *</Label>
            <Select 
              value={volunteerData.gender} 
              onValueChange={(value: "brother" | "sister") => setVolunteerData(prev => ({ ...prev, gender: value }))}
            >
              <SelectTrigger className="border-amber-200">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brother">Brother</SelectItem>
                <SelectItem value="sister">Sister</SelectItem>
              </SelectContent>
            </Select>
            {selectedRole && (
              <div className="text-xs text-amber-600">
                Available slots - Brothers: {getRemainingSlots(selectedRole, 'brother')}/{selectedRole.slots_brother}, 
                Sisters: {getRemainingSlots(selectedRole, 'sister')}/{selectedRole.slots_sister}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-amber-800">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements, questions, or information..."
              value={volunteerData.notes}
              onChange={(e) => setVolunteerData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="border-amber-200 focus:border-amber-400"
            />
          </div>

          {selectedRole && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-medium mb-2 text-amber-800">Role Details:</h4>
              <div className="text-sm text-amber-700 space-y-1">
                <div><strong>Time:</strong> {selectedRole.shift_start} - {selectedRole.shift_end}</div>
                <div><strong>Date:</strong> {new Date(event?.start_datetime || '').toLocaleDateString()}</div>
                <div><strong>Location:</strong> {event?.location}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
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
