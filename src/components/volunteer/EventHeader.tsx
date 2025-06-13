
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";
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
      <div className="container mx-auto px-4 py-6">
        {/* Logo only header */}
        <div className="flex justify-center mb-6">
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
            <div className="text-center mb-4">
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold mb-2`}>
                {event.title}
              </h1>
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-white/90 leading-relaxed`}>
                {event.description}
              </p>
            </div>
            
            <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'justify-center space-x-8'} text-white/90`}>
              <div className="flex items-center justify-center space-x-2">
                <Calendar className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <span className={`${isMobile ? 'text-sm' : 'text-base'}`}>
                  {new Date(event.start_datetime).toLocaleDateString()} at {formatTime(event.start_datetime)}
                </span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <MapPin className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                <span className={`${isMobile ? 'text-sm' : 'text-base'}`}>{event.location}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventHeader;
