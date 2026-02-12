
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
    <div className="bg-gradient-to-r from-navy-800 to-navy-900 text-white">
      <div className="container mx-auto px-4 py-2">
        {/* Logo only header */}
        <div className="flex justify-center mb-2">
          <div className="bg-white rounded-lg flex items-center justify-center shadow-lg p-3">
            <img 
              src="/images/umma_stewards.png" 
              alt="UMMA Stewards" 
              className="h-14 w-auto object-contain rounded"
            />
          </div>
        </div>

        <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="text-center">
              <h1 className={`${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} font-semibold mb-1 text-white`}>
                {event.title}
              </h1>
              <div className="flex items-center justify-center space-x-2 text-white/90">
                <Calendar className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className="text-sm">
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
