

import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Event } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";

interface EventHeaderProps {
  event: Event;
}

const formatTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const EventHeader = ({ event }: EventHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-gradient-to-r from-umma-600 to-umma-700 text-white">
      <div className="container mx-auto px-4 py-4">
        {/* Logo only header */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <img 
              src="/lovable-uploads/4d932e1e-7b46-4da9-8bd2-d2956c6271db.png" 
              alt="UMMA Logo" 
              className="w-12 h-12 object-contain"
            />
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
                  {new Date(event.start_datetime).toLocaleDateString()} at {formatTime(event.start_datetime)}
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

