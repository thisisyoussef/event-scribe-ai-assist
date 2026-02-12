
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export interface AdditionalDetails {
  // Removed marketingLevel, ageGroups, tone, and expectedAttendance for templates
}

interface AdditionalDetailsWizardProps {
  details: AdditionalDetails;
  onDetailsChange: (details: AdditionalDetails) => void;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  disabled?: boolean;
}



const AdditionalDetailsWizard = ({ 
  details, 
  onDetailsChange, 
  isExpanded, 
  onToggleExpand,
  disabled = false
}: AdditionalDetailsWizardProps) => {




  if (!isExpanded) {
    return (
      <Card className="border-white/10 bg-gold-400/10">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gold-400/15 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Enhanced Event Details</h3>
              <p className="text-sm text-gold-400">Not available for templates</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Enhanced Event Details</span>
          </div>
          <Button 
            onClick={() => onToggleExpand(false)} 
            variant="ghost" 
            size="sm"
            className="text-gold-400"
            disabled={disabled}
          >
            Skip for now
            </Button>
        </CardTitle>
        <p className="text-sm text-gold-400">
          These optional details help provide better suggestions for volunteer roles and event planning.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Enhanced Details Not Available</h3>
          <p className="text-white/50">
            Marketing level, age groups, tone, and expected attendance are not available for templates.
            These fields can be configured when creating individual events.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdditionalDetailsWizard;
