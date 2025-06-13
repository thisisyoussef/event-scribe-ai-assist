
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Event } from "@/types/database";

interface EventDescriptionProps {
  event: Event;
}

const EventDescription = ({ event }: EventDescriptionProps) => {
  if (!event.description) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-umma-800 text-lg">About This Event</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-umma-700 text-sm leading-relaxed">{event.description}</div>
      </CardContent>
    </Card>
  );
};

export default EventDescription;
