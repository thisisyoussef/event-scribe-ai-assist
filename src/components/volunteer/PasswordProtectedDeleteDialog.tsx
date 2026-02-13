
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
import { Volunteer } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface PasswordProtectedDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  volunteer: Volunteer | null;
  isDeleting: boolean;
}

const PasswordProtectedDeleteDialog = ({
  isOpen,
  onClose,
  onConfirm,
  volunteer,
  isDeleting
}: PasswordProtectedDeleteDialogProps) => {
  const [password, setPassword] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);

  const handleConfirm = () => {
    if (password.trim()) {
      onConfirm(password);
      setPassword("");
    }
  };

  const handleClose = () => {
    setPassword("");
    setShowContactInfo(false);
    onClose();
  };

  if (!volunteer) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-800">
            Remove Volunteer?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3">
            <p className="text-white/50">
              Are you sure you want to remove <strong>{volunteer.name}</strong> from this volunteer role?
            </p>
            
            <div className="bg-red-500/10 p-3 rounded-lg border border-white/10">
              <p className="text-red-400 text-sm">
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
                    disabled={isDeleting}
                  />
                </div>
                
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowContactInfo(true)}
                    className="text-sm text-gold-400 hover:text-gold-300 p-0"
                  >
                    Don't have the password? Contact an admin
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gold-400/10 p-4 rounded-lg border border-gold-400/20">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gold-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gold-300 mb-2">Contact Event Organizers</h4>
                    <p className="text-white/70 text-sm mb-3">
                      Please reach out to the event organizers or administrators to remove this volunteer from the list.
                    </p>
                    <p className="text-white/60 text-sm">
                      Include the volunteer's name (<strong>{volunteer.name}</strong>) and phone number in your request.
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowContactInfo(false)}
                    className="text-sm text-gold-400 hover:text-gold-300 p-0"
                  >
                    ← Back to password entry
                  </Button>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={handleClose}>
            Cancel
          </AlertDialogCancel>
          {!showContactInfo && (
            <AlertDialogAction 
              onClick={handleConfirm}
              disabled={isDeleting || !password.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Removing..." : "Yes, Remove"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PasswordProtectedDeleteDialog;
