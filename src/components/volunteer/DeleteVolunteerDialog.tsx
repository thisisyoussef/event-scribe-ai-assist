
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
import { Volunteer } from "@/types/database";

interface DeleteVolunteerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  volunteer: Volunteer | null;
  isDeleting: boolean;
}

const DeleteVolunteerDialog = ({
  isOpen,
  onClose,
  onConfirm,
  volunteer,
  isDeleting
}: DeleteVolunteerDialogProps) => {
  if (!volunteer) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
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
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600"
          >
            {isDeleting ? "Removing..." : "Yes, Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteVolunteerDialog;
