import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, ArrowLeft, Phone, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event, VolunteerRole, Volunteer } from "@/types/database";
import { formatDateInMichigan, formatTimeInMichigan } from "@/utils/timezoneUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DeleteVolunteerDialog from "@/components/volunteer/DeleteVolunteerDialog";

const EventRoster = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<(Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    volunteer: Volunteer | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    volunteer: null,
    isDeleting: false
  });

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      await loadEvent();
    };
    
    checkUser();
  }, [eventId, navigate]);

  const loadEvent = async () => {
    if (!eventId) return;
    
    try {
      console.log("Loading event with ID:", eventId);
      
      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*),
          volunteers(*)
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error loading event:', error);
        setEvent(null);
        return;
      }

      console.log("Found event:", eventData);
      setEvent(eventData as Event & { volunteer_roles?: VolunteerRole[], volunteers?: Volunteer[] });
    } catch (error) {
      console.error('Error:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (volunteer: Volunteer) => {
    setDeleteDialog({
      isOpen: true,
      volunteer,
      isDeleting: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.volunteer) return;
    
    setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
    
    try {
      await removeVolunteer(deleteDialog.volunteer.id, deleteDialog.volunteer.name);
      setDeleteDialog({ isOpen: false, volunteer: null, isDeleting: false });
    } catch (error) {
      console.error('Error removing volunteer:', error);
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (!deleteDialog.isDeleting) {
      setDeleteDialog({ isOpen: false, volunteer: null, isDeleting: false });
    }
  };

  const removeVolunteer = async (volunteerId: string, volunteerName: string) => {
    try {
      console.log(`Attempting to remove volunteer ${volunteerId} (${volunteerName})`);
      
      // First, get the current user to check if they're authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error or no user:', authError);
        toast({
          title: "Authentication Required",
          description: "You must be logged in to remove volunteers.",
          variant: "destructive",
        });
        throw authError || new Error('No authenticated user');
      }

      console.log('User authenticated, proceeding with deletion');

      // Perform the deletion with explicit logging
      const { data: deletedData, error } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', volunteerId)
        .select(); // Add select to see what was deleted

      if (error) {
        console.error('Database error removing volunteer:', error);
        toast({
          title: "Database Error",
          description: `Failed to remove volunteer: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }

      console.log('Deletion result:', deletedData);

      if (!deletedData || deletedData.length === 0) {
        console.warn('No volunteer was deleted - possibly already removed or permission issue');
        toast({
          title: "Volunteer Not Found",
          description: "The volunteer may have already been removed or you don't have permission to remove them.",
          variant: "destructive",
        });
        return;
      }

      console.log(`Successfully removed volunteer ${volunteerId} from database`);

      // Update local state
      setEvent(prev => prev ? {
        ...prev,
        volunteers: prev.volunteers?.filter(v => v.id !== volunteerId) || []
      } : null);

      toast({
        title: "Volunteer Removed",
        description: `${volunteerName} has been removed from the event.`,
      });

      console.log(`Completed removal of volunteer ${volunteerId}`);
    } catch (error) {
      console.error('Error in removeVolunteer:', error);
      throw error; // Re-throw to let the calling component handle it
    }
  };

  const getVolunteersForRole = (roleId: string) => {
    return event?.volunteers?.filter((v: Volunteer) => v.role_id === roleId) || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading event details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
              <div className="text-gray-600 mb-4">
                The event you're looking for doesn't exist or has been removed.
              </div>
              <Button onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600 mt-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDateInMichigan(event.start_datetime)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>
                  {formatTimeInMichigan(event.start_datetime)} - {formatTimeInMichigan(event.end_datetime)} (Michigan Time)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Description */}
        {event.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Event Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-600">{event.description}</div>
            </CardContent>
          </Card>
        )}

        {/* Volunteer Roles and Signups */}
        <Card>
          <CardHeader>
            <CardTitle>Volunteer Roster</CardTitle>
            <CardDescription>
              View and manage volunteer signups for this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            {event.volunteer_roles && event.volunteer_roles.length > 0 ? (
              <div className="space-y-6">
                {event.volunteer_roles.map((role: VolunteerRole) => {
                  const volunteers = getVolunteersForRole(role.id);
                  const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
                  const filledSlots = volunteers.length;
                  const remainingSlots = totalSlots - filledSlots;
                  
                  return (
                    <div key={role.id} className="border rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{role.role_label}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>{role.shift_start} - {role.shift_end} (Michigan Time)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4" />
                              <span>{filledSlots} / {totalSlots} filled</span>
                            </div>
                          </div>
                          {role.notes && (
                            <div className="text-sm text-gray-600 mt-2 italic">
                              {role.notes}
                            </div>
                          )}
                        </div>
                        <Badge variant={remainingSlots > 0 ? "default" : "secondary"}>
                          {remainingSlots > 0 ? `${remainingSlots} spots open` : "Full"}
                        </Badge>
                      </div>

                      {volunteers.length > 0 ? (
                        <div className="mt-4">
                          <h4 className="font-medium mb-3">Signed Up Volunteers:</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Gender</TableHead>
                                <TableHead>Signup Date</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {volunteers.map((volunteer: Volunteer) => (
                                <TableRow key={volunteer.id}>
                                  <TableCell className="font-medium">{volunteer.name}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Phone className="w-4 h-4" />
                                      <span>{volunteer.phone}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={volunteer.gender === 'brother' ? 'default' : 'secondary'}>
                                      {volunteer.gender}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {volunteer.signup_date ? formatDateInMichigan(volunteer.signup_date) : 'N/A'}
                                  </TableCell>
                                  <TableCell>{volunteer.notes || '-'}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteClick(volunteer)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No volunteers signed up yet
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Roles Defined</h3>
                <div className="text-gray-500">This event doesn't have any volunteer roles set up yet.</div>
              </div>
            )}
          </CardContent>
        </Card>

        <DeleteVolunteerDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          volunteer={deleteDialog.volunteer}
          isDeleting={deleteDialog.isDeleting}
        />
      </main>
    </div>
  );
};

export default EventRoster;
