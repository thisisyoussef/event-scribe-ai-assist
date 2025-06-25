
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin } from "lucide-react";
import { VolunteerRole, Event } from "@/types/database";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  role: VolunteerRole;
  event: Event;
  volunteerData: {
    name: string;
    phone: string;
    gender: "brother" | "sister";
    notes: string;
  };
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

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  role,
  event,
  volunteerData
}: ConfirmationDialogProps) => {
  const eventDate = new Date(event.start_datetime);
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-umma-800">
            Confirm Your Volunteer Registration
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3">
            <div className="text-umma-600">
              Please confirm your volunteer registration details:
            </div>
            
            <div className="bg-umma-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="font-semibold text-umma-800">{role.role_label}</div>
              
              <div className="flex items-center gap-2 text-umma-700">
                <Calendar className="w-4 h-4" />
                <span>{eventDate.toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-2 text-umma-700">
                <Clock className="w-4 h-4" />
                <span>{formatTime(role.shift_start)} - {formatTime(role.shift_end)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-umma-700">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            </div>
            
            <div className="space-y-1 text-sm">
              <div><strong>Name:</strong> {volunteerData.name}</div>
              <div><strong>Phone:</strong> {volunteerData.phone}</div>
              <div><strong>Gender:</strong> {volunteerData.gender}</div>
              {volunteerData.notes && (
                <div><strong>Notes:</strong> {volunteerData.notes}</div>
              )}
            </div>
            
            <div className="text-umma-600 text-sm">
              You will receive a confirmation SMS with event details.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-umma-500 hover:bg-umma-600"
          >
            Confirm Registration
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;
