import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Trash2, RotateCcw, Calendar, Users, Eye, AlertTriangle, Clock, ArrowLeft, BarChart3, FileText, Globe, UserCheck, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Event, VolunteerRole, Volunteer } from "@/types/database";
import { useEventDeletion } from "@/hooks/useEventDeletion";
import { useEventTemplates } from "@/hooks/useEventTemplates";
import { EventTemplate } from "@/types/eventTemplates";
import { displayTimeInMichigan } from "@/utils/timezoneUtils";

const RecentlyDeleted = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isRestoring, 
    isDeleting,
    isDeletingAll,
    restoreEvent, 
    permanentlyDeleteEvent, 
    permanentlyDeleteAllEvents,
    getSoftDeletedEvents 
  } = useEventDeletion();
  
  const { 
    loadDeletedTemplates, 
    restoreTemplate, 
    permanentlyDeleteTemplate 
  } = useEventTemplates();
  
  const [deletedEvents, setDeletedEvents] = useState<Event[]>([]);
  const [deletedTemplates, setDeletedTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    event: Event | null;
  }>({ isOpen: false, event: null });
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  useEffect(() => {
    loadDeletedEvents();
  }, []);

  const loadDeletedEvents = async () => {
    setLoading(true);
    try {
      const [events, templates] = await Promise.all([
        getSoftDeletedEvents(),
        loadDeletedTemplates()
      ]);
      setDeletedEvents(events);
      setDeletedTemplates(templates);
    } catch (error) {
      console.error('Error loading deleted items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event: Event) => {
    const success = await restoreEvent(event.id, event.title);
    if (success) {
      // Remove from local state
      setDeletedEvents(prev => prev.filter(e => e.id !== event.id));
    }
  };

  const handlePermanentDelete = async (event: Event) => {
    const success = await permanentlyDeleteEvent(event.id, event.title);
    if (success) {
      // Remove from local state
      setDeletedEvents(prev => prev.filter(e => e.id !== event.id));
      setDeleteDialog({ isOpen: false, event: null });
    }
  };

  const handleRestoreTemplate = async (template: EventTemplate) => {
    const success = await restoreTemplate(template.id);
    if (success) {
      // Remove from local state
      setDeletedTemplates(prev => prev.filter(t => t.id !== template.id));
    }
  };

  const handlePermanentlyDeleteTemplate = async (template: EventTemplate) => {
    const success = await permanentlyDeleteTemplate(template.id);
    if (success) {
      // Remove from local state
      setDeletedTemplates(prev => prev.filter(t => t.id !== template.id));
    }
  };

  const handleDeleteAllPermanently = async () => {
    const success = await permanentlyDeleteAllEvents();
    if (success) {
      // Clear all events and templates from local state
      setDeletedEvents([]);
      setDeletedTemplates([]);
      setDeleteAllDialog(false);
    }
  };

  const getEventStats = (event: Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] }) => {
    const totalSlots = event.volunteer_roles?.reduce((sum: number, role: VolunteerRole) =>
      sum + (role.slots_brother || 0) + (role.slots_sister || 0) + (role.slots_flexible || 0), 0) || 0;
    
    const filledSlots = event.volunteers?.length || 0;
    
    return {
      totalSlots,
      filledSlots,
      openSlots: totalSlots - filledSlots
    };
  };

  const getDaysUntilPermanentDeletion = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const daysDiff = Math.ceil((deletedDate.getTime() + (30 * 24 * 60 * 60 * 1000) - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff);
  };

  const getFilteredEvents = () => {
    switch (statusFilter) {
      case 'draft':
        return deletedEvents.filter(event => event.status === 'draft');
      case 'published':
        return deletedEvents.filter(event => event.status === 'published');
      default:
        return deletedEvents;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-3 border-gold-400 border-t-transparent rounded-full mx-auto mb-6"></div>
              <p className="text-white/70 font-medium text-lg">Loading deleted events...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Header with Breadcrumbs */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="h-8 px-2 text-white/50 hover:text-gold-300 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <span>/</span>
            <span className="text-foreground font-medium">Recently Deleted</span>
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
                Recently Deleted
              </h1>
              <p className="text-white/50 text-lg leading-relaxed">
                Recover or permanently remove deleted events and templates
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {(deletedEvents.length > 0 || deletedTemplates.length > 0) && (
                <Button 
                  onClick={() => setDeleteAllDialog(true)}
                  disabled={isDeletingAll}
                  variant="destructive"
                  className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash className="w-4 h-4 mr-2" />
                  {isDeletingAll ? "Deleting All..." : "Delete All Permanently"}
                </Button>
              )}
              <Button 
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="h-10 px-6 text-white/70 border-white/15 hover:bg-white/5 hover:border-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Deleted Events Summary Cards */}
        {deletedEvents.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gold-400/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{deletedEvents.length}</p>
                      <p className="text-sm text-white/50">Total Deleted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/15 rounded-lg">
                      <Globe className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">
                        {deletedEvents.filter(e => e.status === 'published').length}
                      </p>
                      <p className="text-sm text-white/50">Was Published</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/15 rounded-lg">
                      <FileText className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-400">
                        {deletedEvents.filter(e => e.status === 'draft').length}
                      </p>
                      <p className="text-sm text-white/50">Was Draft</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/15 rounded-lg">
                      <UserCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {deletedEvents.filter(e => {
                          const stats = getEventStats(e);
                          return stats.filledSlots > 0;
                        }).length}
                      </p>
                      <p className="text-sm text-white/50">With Volunteers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {deletedTemplates.length > 0 && (
                <Card className="border-0 shadow-lg hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/15 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-300">
                          {deletedTemplates.length}
                        </p>
                        <p className="text-sm text-white/50">Deleted Templates</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        {deletedEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold text-foreground">Filter Events</h3>
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="bg-gold-400/10 text-gold-400 border-gold-400/20">
                  Showing: {statusFilter === 'published' ? 'Published' : 'Draft'} events
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2 p-1 bg-white/10 rounded-lg w-fit">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setStatusFilter('all')}
                className={`h-8 px-4 text-sm rounded-md transition-all ${
                  statusFilter === 'all' 
                    ? 'bg-white/5 text-gold-400 shadow-lg'
                    : 'text-white/50 hover:text-gold-300 hover:bg-white/50'
                }`}
              >
                All ({deletedEvents.length})
              </Button>
              <Button
                variant={statusFilter === 'published' ? 'default' : 'ghost'}
                onClick={() => setStatusFilter('published')}
                className={`h-8 px-4 text-sm rounded-md transition-all ${
                  statusFilter === 'published' 
                    ? 'bg-white/5 text-gold-400 shadow-lg'
                    : 'text-white/50 hover:text-gold-300 hover:bg-white/50'
                }`}
              >
                Published ({deletedEvents.filter(e => e.status === 'published').length})
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'ghost'}
                onClick={() => setStatusFilter('draft')}
                className={`h-8 px-4 text-sm rounded-md transition-all ${
                  statusFilter === 'draft' 
                    ? 'bg-white/5 text-gold-400 shadow-lg'
                    : 'text-white/50 hover:text-gold-300 hover:bg-white/50'
                }`}
              >
                Drafts ({deletedEvents.filter(e => e.status === 'draft').length})
              </Button>
            </div>
          </div>
        )}

        {/* Deleted Events */}
        {getFilteredEvents().length === 0 ? (
          <Card className="border-0 shadow-lg text-center py-16">
            <CardContent>
              <Trash2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white/70 mb-2">
                {deletedEvents.length === 0 ? "No Deleted Events" : "No Events Match Filter"}
              </h3>
              <p className="text-white/40 mb-6">
                {deletedEvents.length === 0 
                  ? "You haven't deleted any events yet." 
                  : `No ${statusFilter === 'all' ? '' : statusFilter} events match your current filter.`
                }
              </p>
              {deletedEvents.length > 0 && statusFilter !== 'all' && (
                <Button
                  variant="outline"
                  onClick={() => setStatusFilter('all')}
                  className="border-white/15 text-white/70 hover:bg-white/5"
                >
                  Show All Events
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {getFilteredEvents().map((event) => {
              const stats = getEventStats(event);
              const daysLeft = getDaysUntilPermanentDeletion(event.deleted_at!);
              
              return (
                <Card key={event.id} className="border-0 shadow-lg hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      {/* Event Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-foreground mb-2">{event.title}</h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-white/50 mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-white/30" />
                                <span>
                                  {new Date(event.start_datetime).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-white/30" />
                                <span>{displayTimeInMichigan(event.start_datetime)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-white/30" />
                                <span>{stats.filledSlots}/{stats.totalSlots} volunteers</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Badge variant="secondary" className="bg-red-500/15 text-red-300 border-red-500/20 text-xs">
                              Deleted
                            </Badge>
                            <Badge variant="outline" className="text-xs border-white/15 text-white/50">
                              {daysLeft} days left
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-white/50">
                            <span className="font-medium">Location:</span> {event.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/50 font-medium">Status:</span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                event.status === 'published' 
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" 
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/20"
                              }`}
                            >
                              {event.status === 'published' ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                        </div>

                        {event.description && (
                          <div className="text-sm text-white/50">
                            <span className="font-medium">Description:</span> {event.description}
                          </div>
                        )}

                        {/* Volunteer Stats */}
                        {stats.totalSlots > 0 && (
                          <div className="bg-background rounded-lg p-4 border border-white/10">
                            <h4 className="font-medium text-foreground mb-3">Volunteer Status</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-white/50">Total Slots:</span>
                                <div className="font-semibold text-foreground">{stats.totalSlots}</div>
                              </div>
                              <div>
                                <span className="text-white/50">Filled:</span>
                                <div className="font-semibold text-emerald-400">{stats.filledSlots}</div>
                              </div>
                              <div>
                                <span className="text-white/50">Open:</span>
                                <div className="font-semibold text-red-400">{stats.openSlots}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-3 lg:w-48">
                        <Button
                          onClick={() => handleRestore(event)}
                          disabled={isRestoring}
                          className="w-full bg-gold-400 hover:bg-gold-300 text-navy-900 h-10"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {isRestoring ? "Restoring..." : "Restore Event"}
                        </Button>
                        
                        <Button
                          onClick={() => setDeleteDialog({ isOpen: true, event })}
                          disabled={isDeleting}
                          variant="outline"
                          className="w-full h-10 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting ? "Deleting..." : "Delete Permanently"}
                        </Button>

                        <div className="text-xs text-white/40 text-center">
                          This action cannot be undone
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Deleted Templates Section */}
        {deletedTemplates.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Deleted Templates</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deletedTemplates.map((template) => (
                <Card key={template.id} className="border-0 shadow-lg hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-300" />
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
                        onClick={() => handleRestoreTemplate(template)}
                        className="flex items-center gap-2 flex-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePermanentlyDeleteTemplate(template)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-white/40">
                      Deleted {template.deleted_at ? new Date(template.deleted_at).toLocaleDateString() : 'recently'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, event: deleteDialog.event })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Permanently Delete Event?</DialogTitle>
            <DialogDescription className="text-white/50">
              This action will permanently remove "{deleteDialog.event?.title}" and all associated data. 
              This cannot be undone.
            </DialogDescription>
            {deleteDialog.event && (
              <div className="mt-2">
                <span className="text-sm text-white/50">Event was: </span>
                <Badge 
                  variant="secondary" 
                  className={deleteDialog.event.status === 'published' 
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20 ml-2" 
                    : "bg-amber-500/15 text-amber-300 border-amber-500/20 ml-2"
                  }
                >
                  {deleteDialog.event.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </div>
            )}
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false, event: null })}
              className="flex-1 border-white/15 text-white/70 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.event && handlePermanentDelete(deleteDialog.event)}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
              <Dialog open={deleteAllDialog} onOpenChange={setDeleteAllDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete All Items Permanently?</DialogTitle>
              <DialogDescription className="text-white/50">
                This action will permanently remove <span className="font-semibold">{deletedEvents.length} event{deletedEvents.length === 1 ? '' : 's'}</span>
                {deletedTemplates.length > 0 && (
                  <> and <span className="font-semibold">{deletedTemplates.length} template{deletedTemplates.length === 1 ? '' : 's'}</span></>
                )} and all associated data. 
                This cannot be undone.
              </DialogDescription>
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-300">
                  <p className="font-medium mb-1">Warning:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All deleted events will be permanently removed</li>
                    <li>All deleted templates will be permanently removed</li>
                    <li>All volunteer roles and signups will be lost</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteAllDialog(false)}
              className="flex-1 border-white/15 text-white/70 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllPermanently}
              disabled={isDeletingAll}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isDeletingAll ? "Deleting All..." : "Delete All Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecentlyDeleted;
