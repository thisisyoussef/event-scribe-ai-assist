import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TimeInput12h } from '@/components/ui/time-input-12h';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useEventTemplates } from '@/hooks/useEventTemplates';
import { LocationInput } from '@/components/ui/location-input';
import { EventTemplate, CreateEventTemplateData } from '@/types/eventTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Clock, 
  MapPin,
  Settings,
  Calendar,
  CheckCircle
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useNavigate } from 'react-router-dom';

/**
 * Templates page with proper access control:
 * - Users can only edit/delete templates they created
 * - Public templates are viewable by everyone but protected from editing
 * - System templates (user_id = '00000000-0000-0000-0000-000000000000') are read-only
 * - Edit/Delete buttons only appear for templates owned by the current user
 */
export default function Templates() {
  const { templates, isLoading, createTemplate, updateTemplate, softDeleteTemplate, currentUser } = useEventTemplates();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null);
  const [newTemplateData, setNewTemplateData] = useState<CreateEventTemplateData>({
    name: '',
    description: '',
    is_public: true,
    details: {
      title: '',
      description: '',
      location: '',
      sms_enabled: true,
      day_before_time: '19:00',
      day_of_time: '15:00'
    },
    itineraries: [],
    volunteer_roles: [],
    pre_event_tasks: []
  });

  const handleSaveTemplate = async () => {
    if (!newTemplateData.name.trim()) return;

    if (editingTemplate) {
      // Update existing template
      const success = await updateTemplate(editingTemplate.id, newTemplateData);
      if (success) {
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
        resetTemplateData();
      }
    } else {
      // Create new template
      const templateId = await createTemplate(newTemplateData);
      if (templateId) {
        setIsCreateDialogOpen(false);
        resetTemplateData();
      }
    }
  };

  const resetTemplateData = () => {
    setNewTemplateData({
      name: '',
      description: '',
      is_public: true,
      details: {
        title: '',
        description: '',
        location: '',
        sms_enabled: true,
        day_before_time: '19:00',
        day_of_time: '15:00'
      },
      itineraries: [],
      volunteer_roles: [],
      pre_event_tasks: []
    });
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingTemplate(null);
    resetTemplateData();
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    resetTemplateData();
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateData.name.trim()) return;

    const templateId = await createTemplate(newTemplateData);
    if (templateId) {
      setIsCreateDialogOpen(false);
      resetTemplateData();
    }
  };

  const handleUseTemplate = (template: EventTemplate) => {
    navigate('/events/create', { state: { templateId: template.id, templateName: template.name } });
  };

  const handleEditTemplate = async (template: EventTemplate) => {
    try {
      // Load full template details
      const { data: fullTemplate, error } = await supabase
        .from('event_templates')
        .select(`
          *,
          event_template_details(*),
          event_template_itineraries(*),
          event_template_volunteer_roles(*),
          event_template_pre_event_tasks(*)
        `)
        .eq('id', template.id)
        .single();

      if (error) throw error;

      if (fullTemplate) {
        // Convert to CreateEventTemplateData format
        const templateData: CreateEventTemplateData = {
          name: fullTemplate.name,
          description: fullTemplate.description || '',
          is_public: fullTemplate.is_public,
          details: {
            title: fullTemplate.event_template_details?.[0]?.title || '',
            description: fullTemplate.event_template_details?.[0]?.description || '',
            location: fullTemplate.event_template_details?.[0]?.location || '',
            sms_enabled: fullTemplate.event_template_details?.[0]?.sms_enabled ?? true,
            day_before_time: fullTemplate.event_template_details?.[0]?.day_before_time || '19:00',
            day_of_time: fullTemplate.event_template_details?.[0]?.day_of_time || '15:00'
          },
          itineraries: fullTemplate.event_template_itineraries?.map(item => ({
            time_slot: item.time_slot,
            activity: item.activity,
            description: item.description || '',
            duration_minutes: item.duration_minutes || 30
          })) || [],
          volunteer_roles: fullTemplate.event_template_volunteer_roles?.map(role => ({
            role_label: role.role_label,
            shift_start: role.shift_start,
            shift_end: role.shift_end,
            slots_brother: role.slots_brother,
            slots_sister: role.slots_sister,
            slots_flexible: role.slots_flexible || 0,
            suggested_poc: role.suggested_poc || '',
            notes: role.notes || ''
          })) || [],
          pre_event_tasks: fullTemplate.event_template_pre_event_tasks?.map(task => ({
            task_description: task.task_description,
            assigned_to: task.assigned_to || '',
            due_date_offset_days: task.due_date_offset_days,
            status: task.status || 'pending'
          })) || []
        };

        setNewTemplateData(templateData);
        setEditingTemplate(template);
        setIsEditDialogOpen(true);
      }
    } catch (error) {
      console.error('Error loading template for editing:', error);
      toast({
        title: "Error",
        description: "Failed to load template for editing.",
        variant: "destructive",
      });
    }
  };

  const getTemplateIcon = (templateName: string) => {
    const lowerName = templateName.toLowerCase();
    if (lowerName.includes('workshop') || lowerName.includes('educational')) {
      return <FileText className="h-5 w-5" />;
    } else if (lowerName.includes('social') || lowerName.includes('gathering')) {
      return <Users className="h-5 w-5" />;
    } else if (lowerName.includes('meeting')) {
      return <Calendar className="h-5 w-5" />;
    }
    return <Settings className="h-5 w-5" />;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                Event Templates
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                Create, manage, and use reusable event templates
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getTemplateIcon(template.name)}
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {template.is_public && (
                      <Badge variant="secondary">Public</Badge>
                    )}
                    <Badge variant="outline">
                      {template.user_id === '00000000-0000-0000-0000-000000000000' ? 'System' : 'Custom'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="flex items-center gap-2 flex-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Use Template
                  </Button>
                  {template.user_id !== '00000000-0000-0000-0000-000000000000' && template.user_id === currentUser?.id && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit template"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => softDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Move template to recently deleted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {!isLoading && templates.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first event template to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Template Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseCreateDialog();
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for your events
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={newTemplateData.name}
                      onChange={(e) => setNewTemplateData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Community Gathering"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Input
                      id="template-description"
                      value={newTemplateData.description}
                      onChange={(e) => setNewTemplateData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this template"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-public"
                    checked={newTemplateData.is_public}
                    onCheckedChange={(checked) => setNewTemplateData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="template-public">Make template public</Label>
                </div>
              </div>

              {/* Template Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Template Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-title">Default Title</Label>
                    <Input
                      id="template-title"
                      value={newTemplateData.details.title}
                      onChange={(e) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, title: e.target.value }
                      }))}
                      placeholder="Default event title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-location">Default Location</Label>
                    <LocationInput
                      value={newTemplateData.details.location}
                      onChange={(value) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, location: value }
                      }))}
                      placeholder="Select or type a location..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-description-details">Default Description</Label>
                  <Textarea
                    id="template-description-details"
                    value={newTemplateData.details.description}
                    onChange={(e) => setNewTemplateData(prev => ({ 
                      ...prev, 
                      details: { ...prev.details, description: e.target.value }
                    }))}
                    placeholder="Default event description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Settings</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="template-sms"
                    checked={newTemplateData.details.sms_enabled}
                    onCheckedChange={(checked) => setNewTemplateData(prev => ({ 
                      ...prev, 
                      details: { ...prev.details, sms_enabled: checked }
                    }))}
                  />
                  <Label htmlFor="template-sms">Enable SMS notifications</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-day-before">Day Before SMS</Label>
                    <Input
                      id="template-day-before"
                      type="time"
                      value={newTemplateData.details.day_before_time}
                      onChange={(e) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, day_before_time: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-day-of">Day Of SMS</Label>
                    <Input
                      id="template-day-of"
                      type="time"
                      value={newTemplateData.details.day_of_time}
                      onChange={(e) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, day_of_time: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Itineraries */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Itinerary</h3>
                <div className="space-y-3">
                  {newTemplateData.itineraries.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <TimeInput12h
                          value={item.time_slot}
                          onChange={(val) => {
                            const newItineraries = [...newTemplateData.itineraries];
                            newItineraries[index] = { ...item, time_slot: val };
                            setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                          }}
                          className=""
                        />
                        <Input
                          value={item.activity}
                          onChange={(e) => {
                            const newItineraries = [...newTemplateData.itineraries];
                            newItineraries[index] = { ...item, activity: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                          }}
                          placeholder="Activity"
                        />
                        <Input
                          value={item.description || ''}
                          onChange={(e) => {
                            const newItineraries = [...newTemplateData.itineraries];
                            newItineraries[index] = { ...item, description: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                          }}
                          placeholder="Description (optional)"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newItineraries = newTemplateData.itineraries.filter((_, i) => i !== index);
                          setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newItineraries = [...newTemplateData.itineraries, {
                        time_slot: '',
                        activity: '',
                        description: '',
                        duration_minutes: 30
                      }];
                      setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                    }}
                  >
                    Add Itinerary Item
                  </Button>
                </div>
              </div>

              {/* Volunteer Roles */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Volunteer Roles</h3>
                <div className="space-y-3">
                  {newTemplateData.volunteer_roles.map((role, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={role.role_label}
                          onChange={(e) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, role_label: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          placeholder="Role Label"
                        />
                        <Input
                          value={role.notes || ''}
                          onChange={(e) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, notes: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          placeholder="Notes (optional)"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <TimeInput12h
                          value={role.shift_start}
                          onChange={(val) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, shift_start: val };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                        />
                        <TimeInput12h
                          value={role.shift_end}
                          onChange={(val) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, shift_end: val };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          value={role.slots_brother === 0 ? '' : role.slots_brother}
                          onChange={(e) => {
                            const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, slots_brother: next };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          onBlur={(e) => {
                            const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                            if (next !== role.slots_brother) {
                              const newRoles = [...newTemplateData.volunteer_roles];
                              newRoles[index] = { ...role, slots_brother: next };
                              setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                            }
                          }}
                          placeholder="Brother Slots"
                          min="0"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          value={role.slots_sister === 0 ? '' : role.slots_sister}
                          onChange={(e) => {
                            const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, slots_sister: next };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          onBlur={(e) => {
                            const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                            if (next !== role.slots_sister) {
                              const newRoles = [...newTemplateData.volunteer_roles];
                              newRoles[index] = { ...role, slots_sister: next };
                              setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                            }
                          }}
                          placeholder="Sister Slots"
                          min="0"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          value={role.slots_flexible === 0 ? '' : role.slots_flexible}
                          onChange={(e) => {
                            const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, slots_flexible: next };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          onBlur={(e) => {
                            const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                            if (next !== role.slots_flexible) {
                              const newRoles = [...newTemplateData.volunteer_roles];
                              newRoles[index] = { ...role, slots_flexible: next };
                              setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                            }
                          }}
                          placeholder="Flexible Slots"
                          min="0"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newRoles = newTemplateData.volunteer_roles.filter((_, i) => i !== index);
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                        >
                          Remove Role
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newRoles = [...newTemplateData.volunteer_roles, {
                        role_label: '',
                        shift_start: '',
                        shift_end: '',
                        slots_brother: 1,
                        slots_sister: 1,
                        slots_flexible: 0,
                        notes: ''
                      }];
                      setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                    }}
                  >
                    Add Volunteer Role
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseCreateDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTemplate} 
                disabled={!newTemplateData.name.trim()}
              >
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseEditDialog();
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template: {editingTemplate?.name}</DialogTitle>
              <DialogDescription>
                Update your template configuration
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-template-name">Template Name *</Label>
                    <Input
                      id="edit-template-name"
                      value={newTemplateData.name}
                      onChange={(e) => setNewTemplateData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Community Gathering"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-template-description">Description</Label>
                    <Input
                      id="edit-template-description"
                      value={newTemplateData.description}
                      onChange={(e) => setNewTemplateData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this template"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-template-public"
                    checked={newTemplateData.is_public}
                    onCheckedChange={(checked) => setNewTemplateData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="edit-template-public">Make template public</Label>
                </div>
              </div>

              {/* Template Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Template Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-template-title">Default Title</Label>
                    <Input
                      id="edit-template-title"
                      value={newTemplateData.details.title}
                      onChange={(e) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, title: e.target.value }
                      }))}
                      placeholder="Default event title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-template-location">Default Location</Label>
                    <LocationInput
                      value={newTemplateData.details.location}
                      onChange={(value) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, location: value }
                      }))}
                      placeholder="Select or type a location..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-template-description-details">Default Description</Label>
                  <Textarea
                    id="edit-template-description-details"
                    value={newTemplateData.details.description}
                    onChange={(e) => setNewTemplateData(prev => ({ 
                      ...prev, 
                      details: { ...prev.details, description: e.target.value }
                    }))}
                    placeholder="Default event description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Settings</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="edit-template-sms"
                    checked={newTemplateData.details.sms_enabled}
                    onCheckedChange={(checked) => setNewTemplateData(prev => ({ 
                      ...prev, 
                      details: { ...prev.details, sms_enabled: checked }
                    }))}
                  />
                  <Label htmlFor="edit-template-sms">Enable SMS notifications</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-template-day-before">Day Before SMS</Label>
                    <Input
                      id="edit-template-day-before"
                      type="time"
                      value={newTemplateData.details.day_before_time}
                      onChange={(e) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, day_before_time: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-template-day-of">Day Of SMS</Label>
                    <Input
                      id="edit-template-day-of"
                      type="time"
                      value={newTemplateData.details.day_of_time}
                      onChange={(e) => setNewTemplateData(prev => ({ 
                        ...prev, 
                        details: { ...prev.details, day_of_time: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Itineraries */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Itinerary</h3>
                <div className="space-y-3">
                  {newTemplateData.itineraries.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <TimeInput12h
                          value={item.time_slot}
                          onChange={(val) => {
                            const newItineraries = [...newTemplateData.itineraries];
                            newItineraries[index] = { ...item, time_slot: val };
                            setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                          }}
                        />
                        <Input
                          value={item.activity}
                          onChange={(e) => {
                            const newItineraries = [...newTemplateData.itineraries];
                            newItineraries[index] = { ...item, activity: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                          }}
                          placeholder="Activity"
                        />
                        <Input
                          value={item.description || ''}
                          onChange={(e) => {
                            const newItineraries = [...newTemplateData.itineraries];
                            newItineraries[index] = { ...item, description: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                          }}
                          placeholder="Description (optional)"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newItineraries = newTemplateData.itineraries.filter((_, i) => i !== index);
                          setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newItineraries = [...newTemplateData.itineraries, {
                        time_slot: '',
                        activity: '',
                        description: '',
                        duration_minutes: 30
                      }];
                      setNewTemplateData(prev => ({ ...prev, itineraries: newItineraries }));
                    }}
                  >
                    Add Itinerary Item
                  </Button>
                </div>
              </div>

              {/* Volunteer Roles */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Volunteer Roles</h3>
                <div className="space-y-3">
                  {newTemplateData.volunteer_roles.map((role, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={role.role_label}
                          onChange={(e) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, role_label: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          placeholder="Role Label"
                        />
                        <Input
                          value={role.notes || ''}
                          onChange={(e) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, notes: e.target.value };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          placeholder="Notes (optional)"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <TimeInput12h
                          value={role.shift_start}
                          onChange={(val) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, shift_start: val };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                        />
                        <TimeInput12h
                          value={role.shift_end}
                          onChange={(val) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, shift_end: val };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                        />
                        <Input
                          type="number"
                          value={role.slots_brother}
                          onChange={(e) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, slots_brother: parseInt(e.target.value) || 0 };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          placeholder="Brother Slots"
                          min="0"
                        />
                        <Input
                          type="number"
                          value={role.slots_sister}
                          onChange={(e) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, slots_sister: parseInt(e.target.value) || 0 };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          placeholder="Sister Slots"
                          min="0"
                        />
                        <Input
                          type="number"
                          value={role.slots_flexible}
                          onChange={(e) => {
                            const newRoles = [...newTemplateData.volunteer_roles];
                            newRoles[index] = { ...role, slots_flexible: parseInt(e.target.value) || 0 };
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                          placeholder="Flexible Slots"
                          min="0"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newRoles = newTemplateData.volunteer_roles.filter((_, i) => i !== index);
                            setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                          }}
                        >
                          Remove Role
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newRoles = [...newTemplateData.volunteer_roles, {
                        role_label: '',
                        shift_start: '',
                        shift_end: '',
                        slots_brother: 1,
                        slots_sister: 1,
                        slots_flexible: 0,
                        notes: ''
                      }];
                      setNewTemplateData(prev => ({ ...prev, volunteer_roles: newRoles }));
                    }}
                  >
                    Add Volunteer Role
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseEditDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTemplate} 
                disabled={!newTemplateData.name.trim()}
              >
                Update Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
