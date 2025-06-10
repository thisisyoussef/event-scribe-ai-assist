
import { Calendar, Clock, MapPin, Heart } from "lucide-react";
import { Event } from "@/types/database";

interface EventHeaderProps {
  event: Event;
}

const EventHeader = ({ event }: EventHeaderProps) => {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">
            EasyEvent
          </h1>
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-amber-800 mb-2">{event.title}</h2>
          <div className="flex flex-wrap items-center gap-4 text-amber-600">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(event.start_datetime).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(event.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                {new Date(event.end_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EventHeader;
