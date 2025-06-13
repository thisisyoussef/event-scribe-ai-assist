
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Trash2, User } from "lucide-react";
import { Volunteer } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";

interface VolunteerTableProps {
  volunteers: Volunteer[];
  onRemoveVolunteer: (volunteerId: string, volunteerName: string) => void;
}

const VolunteerTable = ({ volunteers, onRemoveVolunteer }: VolunteerTableProps) => {
  const isMobile = useIsMobile();

  if (volunteers.length === 0) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="mt-4 border-t border-umma-100 pt-4">
        <h4 className="font-medium mb-3 text-umma-800 text-sm">Current Volunteers:</h4>
        <div className="space-y-3">
          {volunteers.map((volunteer: Volunteer) => (
            <div key={volunteer.id} className="bg-umma-50 rounded-lg p-3 border border-umma-200">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-umma-600" />
                  <span className="font-medium text-umma-800 text-sm">{volunteer.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveVolunteer(volunteer.id, volunteer.name)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2 text-umma-700">
                  <Phone className="w-3 h-3" />
                  <span>{volunteer.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={volunteer.gender === 'brother' ? 'default' : 'secondary'} className="bg-umma-100 text-umma-700 border-umma-200 text-xs py-0 px-2">
                    {volunteer.gender}
                  </Badge>
                  {volunteer.notes && (
                    <span className="text-umma-600 text-xs italic truncate ml-2">{volunteer.notes}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-umma-100 pt-4">
      <h4 className="font-medium mb-3 text-umma-800">Current Volunteers:</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-umma-200 bg-umma-50">
              <th className="text-left p-3 font-semibold text-umma-800">Name</th>
              <th className="text-left p-3 font-semibold text-umma-800">Phone</th>
              <th className="text-left p-3 font-semibold text-umma-800">Gender</th>
              <th className="text-left p-3 font-semibold text-umma-800">Notes</th>
              <th className="text-left p-3 font-semibold text-umma-800">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {volunteers.map((volunteer: Volunteer) => (
              <tr key={volunteer.id} className="border-b border-umma-100 hover:bg-umma-50">
                <td className="p-3 font-medium text-umma-800">{volunteer.name}</td>
                <td className="p-3">
                  <div className="flex items-center space-x-2 text-umma-700">
                    <Phone className="w-4 h-4" />
                    <span>{volunteer.phone}</span>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={volunteer.gender === 'brother' ? 'default' : 'secondary'} className="bg-umma-100 text-umma-700 border-umma-200">
                    {volunteer.gender}
                  </Badge>
                </td>
                <td className="p-3 text-umma-700">{volunteer.notes || '-'}</td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemoveVolunteer(volunteer.id, volunteer.name)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
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
  );
};

export default VolunteerTable;
