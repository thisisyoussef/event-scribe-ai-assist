
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Trash2 } from "lucide-react";
import { Volunteer } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VolunteerTableProps {
  volunteers: Volunteer[];
  onRemoveVolunteer: (volunteerId: string, volunteerName: string) => void;
}

const VolunteerTable = ({ volunteers, onRemoveVolunteer }: VolunteerTableProps) => {
  if (volunteers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-umma-100 pt-4">
      <h4 className="font-medium mb-3 text-umma-800">Current Volunteers:</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-umma-800">Name</TableHead>
            <TableHead className="text-umma-800">Phone</TableHead>
            <TableHead className="text-umma-800">Gender</TableHead>
            <TableHead className="text-umma-800">Notes</TableHead>
            <TableHead className="text-umma-800">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {volunteers.map((volunteer: Volunteer) => (
            <TableRow key={volunteer.id}>
              <TableCell className="font-medium text-umma-800">{volunteer.name}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2 text-umma-700">
                  <Phone className="w-4 h-4" />
                  <span>{volunteer.phone}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={volunteer.gender === 'brother' ? 'default' : 'secondary'} className="bg-umma-100 text-umma-700 border-umma-200">
                  {volunteer.gender}
                </Badge>
              </TableCell>
              <TableCell className="text-umma-700">{volunteer.notes || '-'}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveVolunteer(volunteer.id, volunteer.name)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default VolunteerTable;
