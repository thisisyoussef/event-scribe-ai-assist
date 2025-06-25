
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import { Event, VolunteerRole } from "@/types/database";
import { generateCalendarEvent, downloadICSFile } from "@/utils/calendarUtils";

interface AddToCalendarProps {
  event: Event;
  role: VolunteerRole;
  className?: string;
}

const AddToCalendar = ({ event, role, className }: AddToCalendarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleAddToCalendar = (type: 'google' | 'outlook' | 'ics') => {
    const calendarData = generateCalendarEvent(event, role);
    
    switch (type) {
      case 'google':
        window.open(calendarData.google, '_blank');
        break;
      case 'outlook':
        window.open(calendarData.outlook, '_blank');
        break;
      case 'ics':
        downloadICSFile(calendarData.ics, `${event.title}-${role.role_label}.ics`);
        break;
    }
    
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`border-umma-300 text-umma-700 hover:bg-umma-50 ${className}`}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Add to Calendar
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white border-umma-200 shadow-lg">
        <DropdownMenuItem 
          onClick={() => handleAddToCalendar('google')}
          className="hover:bg-umma-50 cursor-pointer"
        >
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAddToCalendar('outlook')}
          className="hover:bg-umma-50 cursor-pointer"
        >
          Outlook Calendar
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAddToCalendar('ics')}
          className="hover:bg-umma-50 cursor-pointer"
        >
          Download .ics file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddToCalendar;
