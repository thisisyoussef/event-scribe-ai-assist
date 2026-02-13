import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEventTemplates } from '@/hooks/useEventTemplates';
import { CreateEventTemplateData } from '@/types/eventTemplates';
import { FileText, Save, RefreshCw, Plus } from 'lucide-react';

interface SaveAsTemplateDialogProps {
  eventData: any;
  itinerary: any[];
  additionalDetails: any;
  preEventTasks: any[];
  disabled?: boolean;
  sourceTemplateId?: string; // ID of the template that was used, if any
  sourceTemplateName?: string; // Name of the source template
}

export default function SaveAsTemplateDialog({ 
  eventData, 
  itinerary, 
  additionalDetails, 
  preEventTasks, 
  disabled = false,
  sourceTemplateId,
  sourceTemplateName
}: SaveAsTemplateDialogProps) {
  // Helper function to add minutes to time
  const addTimeMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime12Hour = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const hour = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };
  
  const { createTemplate, updateTemplate, currentUser, templates, loadTemplates } = useEventTemplates();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'override'>('new');
  const [showOverrideConfirmation, setShowOverrideConfirmation] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    is_public: true
  });

  // Initialize template data if we have a source template
  useEffect(() => {
    if (sourceTemplateId && sourceTemplateName) {
      setTemplateData(prev => ({
        ...prev,
        name: sourceTemplateName,
        description: `Updated version of ${sourceTemplateName}`
      }));
      setSaveMode('override');
      setSelectedTemplateId(sourceTemplateId);
    }
  }, [sourceTemplateId, sourceTemplateName]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Load templates when dialog opens
      loadTemplates();
      
      if (sourceTemplateId && sourceTemplateName) {
        setTemplateData({
          name: sourceTemplateName,
          description: `Updated version of ${sourceTemplateName}`,
          is_public: true
        });
        setSaveMode('override');
        setSelectedTemplateId(sourceTemplateId);
      } else {
        setTemplateData({
          name: '',
          description: '',
          is_public: true
        });
        setSaveMode('new');
        setSelectedTemplateId('');
      }
      setShowOverrideConfirmation(false);
    }
  }, [isOpen, sourceTemplateId, sourceTemplateName, loadTemplates]);

  const handleSave = async () => {
    if (!templateData.name.trim()) {
      return;
    }

    // Show confirmation for override mode
    if (saveMode === 'override' && !showOverrideConfirmation) {
      setShowOverrideConfirmation(true);
      return;
    }

    setIsSaving(true);
    try {
      // Convert current event data to template format
      const templateDataToSave: CreateEventTemplateData = {
        name: templateData.name,
        description: templateData.description,
        is_public: templateData.is_public,
        details: {
          title: eventData.title || 'Event Template',
          description: eventData.description || '',
          location: eventData.location || '',
          sms_enabled: eventData.smsEnabled || false,
          day_before_time: eventData.dayBeforeTime || '19:00',
          day_of_time: eventData.dayOfTime || '15:00'
        },
        itineraries: itinerary.map(item => ({
          time_slot: item.time,
          activity: item.title,
          description: item.description || '',
          duration_minutes: 30 // Default duration
        })),
        volunteer_roles: itinerary.flatMap(item => 
          (item.volunteerRoles || []).map(role => ({
            role_label: role.roleLabel,
            shift_start: role.shiftStartTime,
            shift_end: role.shiftEndTime,
            slots_brother: role.slotsBrother,
            slots_sister: role.slotsSister,
            slots_flexible: role.slotsFlexible || 0,
            suggested_poc: role.suggestedPOC?.[0] || '',
            notes: role.notes || ''
          }))
        ),
        pre_event_tasks: preEventTasks.map(task => ({
          task_description: task.title || task.task_description || task.description || '',
          assigned_to: Array.isArray(task.assignedTo) ? task.assignedTo[0] || '' : task.assignedTo || '',
          due_date_offset_days: task.dueDateOffsetDays || 0,
          status: task.status || 'pending'
        }))
      };

      let success = false;

      if (saveMode === 'override' && selectedTemplateId) {
        // Update existing template
        success = await updateTemplate(selectedTemplateId, templateDataToSave);
        if (success) {
          console.log('Template updated successfully:', selectedTemplateId);
        }
      } else {
        // Create new template
        const templateId = await createTemplate(templateDataToSave);
        success = !!templateId;
        if (success) {
          console.log('Template created successfully with ID:', templateId);
        }
      }

      if (success) {
        setIsOpen(false);
        setTemplateData({ name: '', description: '', is_public: false });
        setSaveMode('new');
        setShowOverrideConfirmation(false);
        // You could add a toast notification here if you have a toast system
        console.log('Template saved successfully');
      } else {
        throw new Error(`Failed to ${saveMode === 'override' ? 'update' : 'create'} template`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      // You could add a toast notification here for error feedback
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasEventData = () => {
    // Check if there's any event data available for templating
    return eventData.title || 
      eventData.location || 
      eventData.description ||
      itinerary.length > 0 ||
      preEventTasks.length > 0;
  };

  const canSaveTemplate = () => {
    // Allow saving if user has entered a template name and at least some basic event data
    const hasTemplateName = templateData.name.trim();
    const eventDataAvailable = hasEventData();
    
    // For update mode, also require a template to be selected
    const canUpdate = saveMode === 'override' ? selectedTemplateId && hasTemplateName && eventDataAvailable : true;
    const canCreate = saveMode === 'new' ? hasTemplateName && eventDataAvailable : true;
    
    const canSave = (saveMode === 'override' && canUpdate) || (saveMode === 'new' && canCreate);
    
    // Debug logging
    console.log('SaveAsTemplate canSaveTemplate check:', {
      hasTemplateName,
      hasEventData: eventDataAvailable,
      saveMode,
      selectedTemplateId,
      templateName: templateData.name,
      eventTitle: eventData.title,
      eventLocation: eventData.location,
      eventDescription: eventData.description,
      itineraryLength: itinerary.length,
      preEventTasksLength: preEventTasks.length,
      canSave,
      disabled,
      currentUser: currentUser ? 'available' : 'not available'
    });
    
    return canSave;
  };

  const hasSourceTemplate = sourceTemplateId && sourceTemplateName;

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Reset state when dialog is closed
      setShowOverrideConfirmation(false);
      setSaveMode('new');
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled || !hasEventData()}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Save Event as Template
          </DialogTitle>
          <DialogDescription>
            Save your current event configuration as a reusable template for future events. You can create a new template or update an existing one.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Save Mode Selection - always show both options */}
          <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <Label className="text-sm font-medium text-gray-700">Save Mode</Label>
            <RadioGroup value={saveMode} onValueChange={(value) => setSaveMode(value as 'new' | 'override')}>
              <div className="flex items-center space-x-2 p-2 hover:bg-white rounded">
                <RadioGroupItem value="override" id="override" />
                <Label htmlFor="override" className="flex items-center gap-2 text-sm cursor-pointer">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  Update existing template
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 hover:bg-white rounded">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Plus className="h-4 w-4 text-green-600" />
                  Create new template
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-gray-600 bg-white p-2 rounded border">
              {saveMode === 'override' 
                ? 'This will replace the existing template with your current changes.'
                : 'This will create a new template, leaving the original unchanged.'
              }
            </p>
          </div>

          {/* Template Selection for Update Mode */}
          {saveMode === 'override' && (
            <div className="space-y-2">
              <Label htmlFor="template-select">Select Template to Update</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No templates available</p>
                      <p className="text-xs mt-1">Create a template first to use this option</p>
                    </div>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-gray-500 truncate">{template.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedTemplateId ? (
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                  You're updating: <span className="font-medium">{templates.find(t => t.id === selectedTemplateId)?.name}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
                  Please select a template to update, or switch to "Create new template" mode
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Community Gathering"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Give your template a descriptive name.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-public">Visibility</Label>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id="template-public"
                  checked={templateData.is_public}
                  onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_public: checked }))}
                />
                <Label htmlFor="template-public" className="text-sm">Make template public</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Public templates can be used by other users.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Describe what this template is for..."
              value={templateData.description}
              onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">This template will include:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {eventData.title && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Event title: "{eventData.title}"</div>}
              {eventData.location && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Location: {eventData.location}</div>}
              {eventData.description && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Event description</div>}
              {itinerary.length > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Itinerary: {itinerary.length} items</div>}
              {itinerary.some(item => item.volunteerRoles?.length > 0) && (
                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span>Volunteer roles: {itinerary.flatMap(item => item.volunteerRoles || []).length} roles</div>
              )}
              {preEventTasks.length > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-orange-500 rounded-full"></span>Pre-event tasks: {preEventTasks.length} tasks</div>}
              <div className="flex items-center gap-2"><span className="w-2 h-2 bg-gray-500 rounded-full"></span>SMS: {formatTime12Hour(eventData.dayBeforeTime)} / {formatTime12Hour(eventData.dayOfTime)}</div>
            </div>
            {!eventData.title && !eventData.location && !eventData.description && itinerary.length === 0 && preEventTasks.length === 0 && (
              <p className="amber-600 mt-2 text-center p-2 bg-amber-50 border border-amber-200 rounded">
                ⚠️ No event data detected. Please add some information before saving as a template.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!canSaveTemplate() || isSaving}
            className="flex items-center gap-2"
          >
            {saveMode === 'override' ? <RefreshCw className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Saving...' : (saveMode === 'override' ? 'Update Template' : 'Save Template')}
          </Button>
        </div>

        {/* Override Confirmation Dialog */}
        {showOverrideConfirmation && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-800 mb-2">
                  Confirm Template Update
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  You're about to update the existing template "{templates.find(t => t.id === selectedTemplateId)?.name}". This will replace the current template with your changes. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowOverrideConfirmation(false)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      setShowOverrideConfirmation(false);
                      await handleSave();
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Yes, Update Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {!canSaveTemplate() && (
          <div className="text-xs text-muted-foreground text-center">
            {!templateData.name.trim() ? 'Enter a template name' : 'Add some event data (title, location, description, itinerary, or tasks)'}
          </div>
        )}
        {/* Debug info - only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 text-center mt-2 p-2 bg-gray-50 rounded border">
            Debug: canSave={canSaveTemplate().toString()}, hasEventData={hasEventData().toString()}, disabled={disabled.toString()}, user={currentUser ? 'yes' : 'no'}, sourceTemplate={hasSourceTemplate ? 'yes' : 'no'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
