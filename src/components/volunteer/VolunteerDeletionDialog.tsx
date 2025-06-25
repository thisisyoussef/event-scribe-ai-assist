import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { Volunteer } from "@/types/database";

interface VolunteerDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  volunteer: Volunteer | null;
  isDeleting: boolean;
}

const VolunteerDeletionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  volunteer,
  isDeleting
}: VolunteerDeletionDialogProps) => {
  const [password, setPassword] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim() || isProcessing || isDeleting) {
      return;
    }

    console.log(`[DIALOG] Confirming deletion with password`);
    setIsProcessing(true);
    
    try {
      await onConfirm(password);
      console.log(`[DIALOG] Deletion completed, closing dialog`);
      handleClose();
    } catch (error) {
      console.error(`[DIALOG] Error during deletion:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing || isDeleting) {
      console.log(`[DIALOG] Cannot close while processing`);
      return;
    }
    
    console.log(`[DIALOG] Closing dialog and resetting state`);
    setPassword("");
    setShowContactInfo(false);
    setIsProcessing(false);
    onClose();
  };

  if (!volunteer) return null;

  const canInteract = !isProcessing && !isDeleting;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-800">
            Remove Volunteer?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3">
            <p className="text-gray-600">
              Are you sure you want to remove <strong>{volunteer.name}</strong> from this volunteer role?
            </p>
            
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm">
                This action cannot be undone. The volunteer will need to sign up again if they want to participate.
              </p>
            </div>

            {!showContactInfo ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="delete-password" className="text-sm font-medium">
                    Enter admin password to proceed:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin password"
                    className="mt-1"
                    disabled={!canInteract}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password.trim() && canInteract) {
                        handleConfirm();
                      }
                    }}
                  />
                </div>
                
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowContactInfo(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 p-0"
                    disabled={!canInteract}
                  >
                    Don't have the password? Contact an admin
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Contact Event Organizers</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      Please reach out to the event organizers or administrators to remove this volunteer from the list.
                    </p>
                    <p className="text-blue-600 text-sm">
                      Include the volunteer's name (<strong>{volunteer.name}</strong>) and phone number in your request.
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowContactInfo(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 p-0"
                    disabled={!canInteract}
                  >
                    ← Back to password entry
                  </Button>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={!canInteract} 
            onClick={handleClose}
          >
            Cancel
          </AlertDialogCancel>
          {!showContactInfo && (
            <AlertDialogAction 
              onClick={handleConfirm}
              disabled={!canInteract || !password.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing || isDeleting ? "Removing..." : "Yes, Remove"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VolunteerDeletionDialog;
