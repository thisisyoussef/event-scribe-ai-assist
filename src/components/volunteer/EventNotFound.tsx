
import { Card, CardContent } from "@/components/ui/card";

interface EventNotFoundProps {
  eventId: string | undefined;
}

const EventNotFound = ({ eventId }: EventNotFoundProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-200 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2 text-amber-800">Event Not Found</h2>
          <div className="text-amber-600 text-sm mb-2">
            The event you're looking for doesn't exist, isn't published yet, or has been removed.
          </div>
          <div className="text-xs text-amber-500 mb-4 break-all">
            Event ID: {eventId}
          </div>
          <div className="text-xs text-amber-400">
            Only published events are available for volunteer signup.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventNotFound;
