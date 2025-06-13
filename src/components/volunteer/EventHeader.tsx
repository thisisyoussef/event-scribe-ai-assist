
import { Card, CardContent } from "@/components/ui/card";
import { Event } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface EventHeaderProps {
  event: Event;
}

const EventHeader = ({ event }: EventHeaderProps) => {
  const isMobile = useIsMobile();
  const [showFullDescription, setShowFullDescription] = useState(false);

  const shouldTruncate = event.description && event.description.length > 100;
  const truncatedDescription = shouldTruncate 
    ? event.description.substring(0, 100) + "..." 
    : event.description;

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
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold mb-2`}>
                {event.title}
              </h1>
              {event.description && (
                <div className={`${isMobile ? 'text-sm' : 'text-base'} text-white/90 leading-relaxed`}>
                  <p className="mb-2">
                    {showFullDescription ? event.description : truncatedDescription}
                  </p>
                  {shouldTruncate && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-white/80 hover:text-white underline text-sm"
                    >
                      {showFullDescription ? "Read less" : "Read more"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventHeader;
