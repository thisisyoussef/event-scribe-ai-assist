
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Event } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatTimeInMichigan, formatDateInMichigan, displayTimeInMichigan } from "@/utils/timezoneUtils";

interface EventHeaderProps {
  event: Event;
}

const EventHeader = ({ event }: EventHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white">
      <div className="container mx-auto px-4 py-4">

        <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="text-center">
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold mb-3 text-white`}>
                {event.title}
              </h1>
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <Calendar className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <span className={`${isMobile ? 'text-sm' : 'text-base'}`}>
                  {formatDateInMichigan(event.start_datetime)} at {displayTimeInMichigan(event.start_datetime)} (Michigan Time)
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
