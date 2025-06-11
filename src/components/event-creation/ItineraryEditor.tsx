
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Clock } from "lucide-react";

interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
}

interface ItineraryEditorProps {
  itinerary: ItineraryItem[];
  onItineraryChange: (itinerary: ItineraryItem[]) => void;
  startTime: string;
  endTime: string;
}

const ItineraryEditor = ({ itinerary, onItineraryChange, startTime, endTime }: ItineraryEditorProps) => {
  const addItineraryItem = () => {
    const newItem: ItineraryItem = {
      id: crypto.randomUUID(),
      time: startTime,
      title: "",
      description: ""
    };
    onItineraryChange([...itinerary, newItem]);
  };

  const updateItineraryItem = (id: string, field: keyof ItineraryItem, value: string) => {
    const updated = itinerary.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onItineraryChange(updated);
  };

  const removeItineraryItem = (id: string) => {
    onItineraryChange(itinerary.filter(item => item.id !== id));
  };

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-amber-800">
          <Clock className="w-5 h-5" />
          <span>Event Itinerary (Optional)</span>
        </CardTitle>
        <p className="text-sm text-amber-600">
          Add a detailed timeline to help AI generate more precise volunteer roles and tasks.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {itinerary.length === 0 ? (
          <div className="text-center py-6 bg-amber-50 rounded-lg border border-amber-200">
            <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-600 mb-4">No itinerary items yet</p>
            <Button onClick={addItineraryItem} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {itinerary.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 lg:grid-cols-4 gap-3 p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="space-y-2">
                    <Label className="text-xs text-amber-700">Time</Label>
                    <Input
                      type="time"
                      value={item.time}
                      onChange={(e) => updateItineraryItem(item.id, 'time', e.target.value)}
                      min={startTime}
                      max={endTime}
                      className="text-sm border-amber-200 focus-visible:ring-amber-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-amber-700">Activity Title</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItineraryItem(item.id, 'title', e.target.value)}
                      placeholder="e.g., Doors Open"
                      className="text-sm border-amber-200 focus-visible:ring-amber-500"
                    />
                  </div>
                  
                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-amber-700">Description</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItineraryItem(item.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItineraryItem(item.id, 'description', e.target.value)}
                      placeholder="Describe what happens during this time"
                      rows={2}
                      className="text-sm resize-none border-amber-200 focus-visible:ring-amber-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <Button onClick={addItineraryItem} variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Item
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ItineraryEditor;
