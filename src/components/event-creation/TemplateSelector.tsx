import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEventTemplates } from '@/hooks/useEventTemplates';
import { EventTemplateWithDetails } from '@/types/eventTemplates';
import { cn } from '@/lib/utils';
import {
  FileText,
  Clock,
  Users,
  CheckCircle,
  Calendar,
  MapPin,
  Settings,
  Globe,
  Wrench,
  BookOpen,
  Heart,
  Sparkles,
  MessageSquare,
  LayoutTemplate,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TemplateSelectorProps {
  onTemplateSelect: (template: EventTemplateWithDetails) => void;
  disabled?: boolean;
  compact?: boolean;
}

type FilterType = 'all' | 'public' | 'custom' | 'system';

export default function TemplateSelector({ onTemplateSelect, disabled = false, compact = false }: TemplateSelectorProps) {
  const { templates, isLoading, loadTemplateDetails } = useEventTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplateWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);

  const handleTemplateSelect = async (template: EventTemplateWithDetails) => {
    setSelectedTemplate(template);
    setIsDialogOpen(false);
    onTemplateSelect(template);
  };

  const handleUseTemplate = async (templateId: string) => {
    setLoadingTemplateId(templateId);
    const full = await loadTemplateDetails(templateId);
    if (full) {
      handleTemplateSelect(full);
    }
    setLoadingTemplateId(null);
  };

  const handlePreviewTemplate = async (templateId: string) => {
    const fullTemplate = await loadTemplateDetails(templateId);
    if (fullTemplate) {
      setSelectedTemplate(fullTemplate);
    }
  };

  // Enhanced icon system with visual recognition
  const getTemplateIcon = (templateName: string) => {
    const lowerName = templateName.toLowerCase();
    const iconClass = "h-5 w-5 text-umma-600";

    if (lowerName.includes('jummah') || lowerName.includes('friday')) {
      return <Calendar className={iconClass} />;
    } else if (lowerName.includes('workshop') || lowerName.includes('educational') || lowerName.includes('class')) {
      return <BookOpen className={iconClass} />;
    } else if (lowerName.includes('social') || lowerName.includes('gathering') || lowerName.includes('community')) {
      return <Users className={iconClass} />;
    } else if (lowerName.includes('fundrais') || lowerName.includes('charity')) {
      return <Heart className={iconClass} />;
    } else if (lowerName.includes('reviv') || lowerName.includes('spiritual') || lowerName.includes('ruh')) {
      return <Sparkles className={iconClass} />;
    } else if (lowerName.includes('meeting')) {
      return <MessageSquare className={iconClass} />;
    }

    return <LayoutTemplate className={iconClass} />;
  };

  // Tag icon based on template type
  const getTagInfo = (template: EventTemplateWithDetails) => {
    if (template.is_public) {
      return { icon: <Globe className="h-3 w-3" />, label: 'Public' };
    }
    if (template.user_id === '00000000-0000-0000-0000-000000000000') {
      return { icon: <Settings className="h-3 w-3" />, label: 'System' };
    }
    return { icon: <Wrench className="h-3 w-3" />, label: 'Custom' };
  };

  // Filter templates based on active filter
  const filteredTemplates = templates.filter(template => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'public') return template.is_public;
    if (activeFilter === 'system') return template.user_id === '00000000-0000-0000-0000-000000000000';
    if (activeFilter === 'custom') return !template.is_public && template.user_id !== '00000000-0000-0000-0000-000000000000';
    return true;
  });

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const filterChips: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'public', label: 'Public' },
    { key: 'custom', label: 'Custom' },
    { key: 'system', label: 'System' },
  ];

  return (
    <div className={compact ? "" : "space-y-4"}>
      <div className={cn("flex items-center justify-between gap-4", compact ? "" : "")}>
        {!compact && (
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">Event Templates</h3>
            <p className="text-sm text-muted-foreground">
              Choose a template to quickly set up your event
            </p>
          </div>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant={compact ? "outline" : "outline"}
              disabled={disabled || isLoading}
              className={cn("flex items-center gap-2 whitespace-nowrap flex-shrink-0", compact ? "h-9 border-stone-300 text-stone-700 bg-white shadow-sm" : "")}
            >
              <FileText className="h-4 w-4" />
              Browse Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[92vw] sm:w-full max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-3xl gap-0 border-umma-200">
            {/* Enhanced Header */}
            <DialogHeader className="border-b border-umma-100 px-4 py-4 flex-shrink-0">
              <DialogTitle className="text-xl font-bold text-umma-800">
                Select Event Template
              </DialogTitle>
              <DialogDescription className="text-xs text-umma-500 mt-1">
                Choose a template to get started quickly
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 min-w-0">
              {/* Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                {filterChips.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={cn(
                      "flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                      activeFilter === filter.key
                        ? "bg-umma-500 text-white shadow-sm"
                        : "bg-umma-50 text-umma-700 hover:bg-umma-100"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Template Cards */}
              <div className="grid gap-3">
                {filteredTemplates.map((template) => {
                  const tagInfo = getTagInfo(template);
                  const isDescExpanded = expandedDescriptionId === template.id;
                  const descriptionLength = template.description?.length || 0;
                  const showExpandButton = descriptionLength > 80;

                  return (
                    <Card
                      key={template.id}
                      className="group relative cursor-pointer transition-all duration-200 active:scale-[0.98] hover:shadow-md border-0 bg-stone-50/50 shadow-sm rounded-3xl min-w-0"
                    >
                      {/* Overlay Tag - Top Right */}
                      <div className="absolute top-4 right-4 z-10">
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-white/80 backdrop-blur-sm shadow-sm rounded-full"
                        >
                          {tagInfo.icon}
                          {tagInfo.label}
                        </Badge>
                      </div>

                      <div className="p-5">
                        {/* Icon + Title Row */}
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                            {getTemplateIcon(template.name)}
                          </div>
                          <div className="flex-1 min-w-0 pr-14">
                            <h4 className="font-semibold text-lg text-umma-900 truncate leading-tight mb-1">
                              {template.name}
                            </h4>
                            {template.description && (
                              <div className="">
                                <p className={cn(
                                  "text-sm text-stone-600 leading-relaxed",
                                  !isDescExpanded && "line-clamp-2"
                                )}>
                                  {template.description}
                                </p>
                                {showExpandButton && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedDescriptionId(isDescExpanded ? null : template.id);
                                    }}
                                    className="flex items-center gap-0.5 text-xs font-medium text-umma-600 hover:text-umma-700 mt-1.5 transition-colors"
                                  >
                                    {isDescExpanded ? (
                                      <>Show less <ChevronUp className="h-3 w-3" /></>
                                    ) : (
                                      <>Show more <ChevronDown className="h-3 w-3" /></>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Button Section */}
                        <div className="mt-5 flex flex-col gap-2">
                          <Button
                            className="w-full h-12 font-semibold shadow-sm hover:shadow-md transition-all rounded-2xl text-base"
                            disabled={loadingTemplateId === template.id}
                            onClick={() => handleUseTemplate(template.id)}
                          >
                            {loadingTemplateId === template.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Use Template
                              </>
                            )}
                          </Button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTemplate(template.id);
                            }}
                            className="text-sm font-medium text-stone-500 hover:text-stone-700 text-center py-2 transition-colors"
                          >
                            Preview details
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-umma-500">
                    <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No templates found for this filter</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="flex-shrink-0 border-t border-umma-100 bg-gradient-to-t from-white via-white to-white/95 px-4 py-3">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="w-full py-2.5 text-center text-sm font-medium text-umma-600 hover:text-umma-800 transition-colors rounded-xl hover:bg-umma-50"
              >
                Continue without template
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        compact ? (
          <div className="w-full mt-2 flex items-center justify-between gap-3 px-4 py-3 bg-stone-100 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <Badge variant="outline" className="bg-white shrink-0 text-xs font-semibold border-stone-300">Selected</Badge>
              <span className="font-medium text-sm text-stone-800 truncate">{selectedTemplate.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)} className="h-8 w-8 p-0 rounded-full hover:bg-stone-200 shrink-0">
              <span className="sr-only">Clear</span>
              <ChevronDown className="h-4 w-4 rotate-180 text-stone-500" />
            </Button>
          </div>
        ) : (
          <Card className="border-2 border-primary/20 bg-primary/5 mt-4">
            <div className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h4 className="text-base font-semibold">Selected: {selectedTemplate.name}</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                  className="h-8 px-3 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="px-4 pb-4 space-y-4">
              {selectedTemplate.details && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-umma-500" />
                      <span className="font-medium text-umma-700">Location:</span>
                      <span className="text-umma-600">{selectedTemplate.details.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-umma-500" />
                      <span className="font-medium text-umma-700">SMS Times:</span>
                      <span className="text-umma-600">
                        {formatTime(selectedTemplate.details.day_before_time)} / {formatTime(selectedTemplate.details.day_of_time)}
                      </span>
                    </div>
                    {selectedTemplate.details.marketing_level && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-umma-500" />
                        <span className="font-medium text-umma-700">Marketing:</span>
                        <Badge variant="outline" className="capitalize text-xs px-2 py-0.5">
                          {selectedTemplate.details.marketing_level}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedTemplate.details.tone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="h-4 w-4 text-umma-500" />
                        <span className="font-medium text-umma-700">Tone:</span>
                        <Badge variant="outline" className="capitalize text-xs px-2 py-0.5">
                          {selectedTemplate.details.tone}
                        </Badge>
                      </div>
                    )}
                    {selectedTemplate.details.age_groups && selectedTemplate.details.age_groups.length > 0 && (
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <Users className="h-4 w-4 text-umma-500" />
                        <span className="font-medium text-umma-700">Age Groups:</span>
                        <div className="flex gap-1 flex-wrap">
                          {selectedTemplate.details.age_groups.map((group, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                              {group.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-umma-500" />
                      <span className="font-medium text-umma-700">Expected:</span>
                      <span className="text-umma-600">{selectedTemplate.details.expected_attendance}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Template Summary */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-umma-100">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {selectedTemplate.itineraries?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Itinerary Items</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {selectedTemplate.volunteer_roles?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Volunteer Roles</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {selectedTemplate.pre_event_tasks?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Pre-Event Tasks</div>
                </div>
              </div>
            </div>
          </Card>
        )
      )}

    </div>
  );
}
