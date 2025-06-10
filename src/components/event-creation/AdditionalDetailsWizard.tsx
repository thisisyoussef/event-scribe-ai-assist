
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Users, Target, Megaphone, X } from "lucide-react";

interface AdditionalDetails {
  marketingLevel: 'low' | 'medium' | 'high' | '';
  ageGroups: string[];
  tone: 'formal' | 'casual' | 'fun' | '';
  expectedAttendance: number;
}

interface AdditionalDetailsWizardProps {
  details: AdditionalDetails;
  onDetailsChange: (details: AdditionalDetails) => void;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
}

const ageGroupOptions = [
  { value: 'youth', label: 'Youth (15-25)' },
  { value: 'adults', label: 'Adults (26-40)' },
  { value: 'seniors', label: 'Seniors (40+)' },
  { value: 'families', label: 'Families with Children' },
  { value: 'all', label: 'All Ages' }
];

const AdditionalDetailsWizard = ({ 
  details, 
  onDetailsChange, 
  isExpanded, 
  onToggleExpand 
}: AdditionalDetailsWizardProps) => {
  const updateDetails = (field: keyof AdditionalDetails, value: any) => {
    onDetailsChange({ ...details, [field]: value });
  };

  const toggleAgeGroup = (ageGroup: string) => {
    const currentGroups = details.ageGroups;
    const updated = currentGroups.includes(ageGroup)
      ? currentGroups.filter(g => g !== ageGroup)
      : [...currentGroups, ageGroup];
    updateDetails('ageGroups', updated);
  };

  const removeAgeGroup = (ageGroup: string) => {
    updateDetails('ageGroups', details.ageGroups.filter(g => g !== ageGroup));
  };

  if (!isExpanded) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Enhanced AI Parsing</h3>
                <p className="text-sm text-blue-600">Help AI generate better suggestions</p>
              </div>
            </div>
            <Button 
              onClick={() => onToggleExpand(true)} 
              variant="outline" 
              size="sm"
              className="border-blue-300 text-blue-700"
            >
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-800">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Additional Details for AI</span>
          </div>
          <Button 
            onClick={() => onToggleExpand(false)} 
            variant="ghost" 
            size="sm"
            className="text-blue-600"
          >
            Skip for now
          </Button>
        </CardTitle>
        <p className="text-sm text-blue-600">
          Answer these optional questions to help AI generate more tailored volunteer roles and marketing suggestions.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Marketing Level */}
        <div className="space-y-3">
          <Label className="flex items-center space-x-2 text-blue-800">
            <Megaphone className="w-4 h-4" />
            <span>Marketing Intensity</span>
          </Label>
          <Select value={details.marketingLevel} onValueChange={(value: 'low' | 'medium' | 'high') => updateDetails('marketingLevel', value)}>
            <SelectTrigger className="border-blue-200">
              <SelectValue placeholder="How much marketing effort do you want?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - Basic announcement</SelectItem>
              <SelectItem value="medium">Medium - Some promotion</SelectItem>
              <SelectItem value="high">High - Full marketing push</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Age Groups */}
        <div className="space-y-3">
          <Label className="flex items-center space-x-2 text-blue-800">
            <Users className="w-4 h-4" />
            <span>Target Age Groups</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {ageGroupOptions.map((option) => (
              <Button
                key={option.value}
                variant={details.ageGroups.includes(option.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAgeGroup(option.value)}
                className={`justify-start text-left ${
                  details.ageGroups.includes(option.value) 
                    ? "bg-blue-600 text-white" 
                    : "border-blue-200 text-blue-700"
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {details.ageGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {details.ageGroups.map((group) => {
                const option = ageGroupOptions.find(opt => opt.value === group);
                return (
                  <Badge key={group} variant="secondary" className="bg-blue-100 text-blue-700">
                    {option?.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgeGroup(group)}
                      className="h-auto p-0 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Tone */}
        <div className="space-y-3">
          <Label className="flex items-center space-x-2 text-blue-800">
            <Target className="w-4 h-4" />
            <span>Event Tone</span>
          </Label>
          <Select value={details.tone} onValueChange={(value: 'formal' | 'casual' | 'fun') => updateDetails('tone', value)}>
            <SelectTrigger className="border-blue-200">
              <SelectValue placeholder="What's the atmosphere you're aiming for?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal - Professional and structured</SelectItem>
              <SelectItem value="casual">Casual - Relaxed and friendly</SelectItem>
              <SelectItem value="fun">Fun - Energetic and engaging</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expected Attendance */}
        <div className="space-y-3">
          <Label className="flex items-center space-x-2 text-blue-800">
            <Users className="w-4 h-4" />
            <span>Expected Attendance: {details.expectedAttendance} people</span>
          </Label>
          <Slider
            value={[details.expectedAttendance]}
            onValueChange={(value) => updateDetails('expectedAttendance', value[0])}
            max={500}
            min={10}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-blue-600">
            <span>10</span>
            <span>250</span>
            <span>500+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdditionalDetailsWizard;
