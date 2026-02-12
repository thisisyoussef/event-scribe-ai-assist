
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
      <Card className="border-umma-200 bg-umma-50/50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-umma-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-umma-600" />
            </div>
            <div>
              <h3 className="font-medium text-umma-800">Enhanced Event Details</h3>
              <p className="text-sm text-umma-600">Not available for templates</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-umma-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-umma-800">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Enhanced Event Details</span>
          </div>
          <Button 
            onClick={() => onToggleExpand(false)} 
            variant="ghost" 
            size="sm"
            className="text-umma-600"
            disabled={disabled}
          >
            Skip for now
            </Button>
        </CardTitle>
        <p className="text-sm text-umma-600">
          These optional details help provide better suggestions for volunteer roles and event planning.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Enhanced Details Not Available</h3>
          <p className="text-gray-600">
            Marketing level, age groups, tone, and expected attendance are not available for templates.
            These fields can be configured when creating individual events.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdditionalDetailsWizard;
