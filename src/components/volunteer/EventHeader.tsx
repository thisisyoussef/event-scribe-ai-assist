
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Event } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatTimeInLocal, formatDateInLocal, displayTimeInLocal, getTimezoneAbbreviation } from "@/utils/timezoneUtils";

interface EventHeaderProps {
  event: Event;
}

const EventHeader = ({ event }: EventHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-gradient-to-r from-primary to-orange-600 text-white">
      <div className="container mx-auto px-4 py-4">
        {/* Logo only header */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Calendar className="w-12 h-12 text-primary" />
          </div>
        </div>

        <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="text-center">
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold mb-3 text-white`}>
                {event.title}
              </h1>
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <Calendar className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <span className={`${isMobile ? 'text-sm' : 'text-base'}`}>
                  {formatDateInLocal(event.start_datetime)} at {displayTimeInLocal(event.start_datetime)} {getTimezoneAbbreviation()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventHeader;
