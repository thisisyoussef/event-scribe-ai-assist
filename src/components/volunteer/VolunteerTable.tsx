
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Trash2, User } from "lucide-react";
import { Volunteer } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVolunteerDeletion } from "@/hooks/useVolunteerDeletion";
import VolunteerDeletionDialog from "./VolunteerDeletionDialog";

interface VolunteerTableProps {
  volunteers: Volunteer[];
  onVolunteerDeleted: (volunteerId: string) => void;
}

const VolunteerTable = ({ volunteers, onVolunteerDeleted }: VolunteerTableProps) => {
  const isMobile = useIsMobile();
  const { deleteVolunteer, isDeleting } = useVolunteerDeletion();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    volunteer: Volunteer | null;
  }>({
    isOpen: false,
    volunteer: null,
  });

  const handleDeleteClick = (volunteer: Volunteer) => {
    console.log(`[TABLE] Opening delete dialog for volunteer: ${volunteer.id} (${volunteer.name})`);
    setDeleteDialog({
      isOpen: true,
      volunteer,
    });
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!deleteDialog.volunteer) {
      console.error(`[TABLE] No volunteer selected for deletion`);
      return;
    }
    
    console.log(`[TABLE] Attempting to delete volunteer: ${deleteDialog.volunteer.id} (${deleteDialog.volunteer.name})`);
    
    const success = await deleteVolunteer(
      deleteDialog.volunteer.id, 
      deleteDialog.volunteer.name, 
      password
    );
    
    console.log(`[TABLE] Deletion result: ${success}`);
    
    if (success) {
      console.log(`[TABLE] Successfully deleted volunteer, calling onVolunteerDeleted`);
      onVolunteerDeleted(deleteDialog.volunteer.id);
      
      // Close dialog after successful deletion
      console.log(`[TABLE] Closing dialog after successful deletion`);
      setDeleteDialog({ isOpen: false, volunteer: null });
    }
    // If deletion failed, dialog remains open for user to retry
  };

  const handleDeleteCancel = () => {
    if (isDeleting) {
      console.log(`[TABLE] Cannot close dialog while deleting`);
      return;
    }
    
    console.log(`[TABLE] Closing delete dialog`);
    setDeleteDialog({ isOpen: false, volunteer: null });
  };

  // Only close dialog when explicitly called, not on state changes
  const handleDialogClose = () => {
    console.log(`[TABLE] Dialog close requested`);
    if (!isDeleting) {
      setDeleteDialog({ isOpen: false, volunteer: null });
    }
  };

  if (volunteers.length === 0) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <div className="mt-4 border-t border-white/5 pt-4">
          <h4 className="font-medium mb-3 text-foreground text-sm">Current Volunteers:</h4>
          <div className="space-y-3">
            {volunteers.map((volunteer: Volunteer) => (
              <div key={volunteer.id} className="bg-gold-400/10 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gold-400" />
                    <span className="font-medium text-foreground text-sm">{volunteer.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClick(volunteer)}
                    className="text-red-400 hover:text-red-300 border-white/10 hover:border-white/15 h-7 w-7 p-0"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2 text-gold-300">
                    <Phone className="w-3 h-3" />
                    <span>{volunteer.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={volunteer.gender === 'brother' ? 'default' : 'secondary'} className="bg-gold-400/15 text-gold-300 border-white/10 text-xs py-0 px-2">
                      {volunteer.gender}
                    </Badge>
                    {volunteer.notes && (
                      <span className="text-gold-400 text-xs italic truncate ml-2">{volunteer.notes}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <VolunteerDeletionDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDialogClose}
          onConfirm={handleDeleteConfirm}
          volunteer={deleteDialog.volunteer}
          isDeleting={isDeleting}
        />
      </>
    );
  }

  return (
    <>
      <div className="mt-6 border-t border-white/5 pt-4">
        <h4 className="font-medium mb-3 text-foreground">Current Volunteers:</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-gold-400/10">
                <th className="text-left p-3 font-semibold text-foreground">Name</th>
                <th className="text-left p-3 font-semibold text-foreground">Phone</th>
                <th className="text-left p-3 font-semibold text-foreground">Gender</th>
                <th className="text-left p-3 font-semibold text-foreground">Notes</th>
                <th className="text-left p-3 font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {volunteers.map((volunteer: Volunteer) => (
                <tr key={volunteer.id} className="border-b border-white/5 hover:bg-gold-400/10">
                  <td className="p-3 font-medium text-foreground">{volunteer.name}</td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2 text-gold-300">
                      <Phone className="w-4 h-4" />
                      <span>{volunteer.phone}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={volunteer.gender === 'brother' ? 'default' : 'secondary'} className="bg-gold-400/15 text-gold-300 border-white/10">
                      {volunteer.gender}
                    </Badge>
                  </td>
                  <td className="p-3 text-gold-300">{volunteer.notes || '-'}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClick(volunteer)}
                      className="text-red-400 hover:text-red-300 border-white/10 hover:border-white/15"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <VolunteerDeletionDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        volunteer={deleteDialog.volunteer}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default VolunteerTable;
