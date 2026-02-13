import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useVolunteerCheckIn } from '@/hooks/useVolunteerCheckIn';
import { AlertTriangle, Users, Trash2, CheckCircle } from 'lucide-react';

interface NoShowCleanupProps {
  eventId: string;
  eventTitle: string;
  onCleanupComplete?: () => void;
}

interface NoShowVolunteer {
  volunteer_id: string;
  volunteer_name: string;
  volunteer_phone: string;
  role_label: string;
  signup_date: string;
}

const NoShowCleanup: React.FC<NoShowCleanupProps> = ({
  eventId,
  eventTitle,
  onCleanupComplete
}) => {
  const { toast } = useToast();
  const { getNoShowVolunteers, cleanupNoShowVolunteers, completeEventAndCleanup, isLoading } = useVolunteerCheckIn();
  const [noShowVolunteers, setNoShowVolunteers] = useState<NoShowVolunteer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<{
    eventTitle: string;
    noShowCount: number;
    removedContacts: Array<{
      id: string;
      name: string;
      phone: string;
    }>;
  } | null>(null);

  // Load no-show volunteers when component mounts
  useEffect(() => {
    loadNoShowVolunteers();
  }, [eventId]);

  const loadNoShowVolunteers = async () => {
    try {
      const noShows = await getNoShowVolunteers(eventId);
      setNoShowVolunteers(noShows);
    } catch (error) {
      console.error('Error loading no-show volunteers:', error);
      toast({
        title: "Error",
        description: "Failed to load no-show volunteers.",
        variant: "destructive",
      });
    }
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const results = await completeEventAndCleanup(eventId);
      
      if (results) {
        setCleanupResults({
          eventTitle: results.event_title,
          noShowCount: results.no_show_count,
          removedContacts: results.removed_contacts || []
        });

        // Reload no-show volunteers to update the list
        await loadNoShowVolunteers();

        toast({
          title: "Cleanup Complete",
          description: `Successfully processed ${results.no_show_count} no-show volunteers.`,
        });

        if (onCleanupComplete) {
          onCleanupComplete();
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Error",
        description: "Failed to complete cleanup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCleanupResults(null);
  };

  if (noShowVolunteers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Volunteers Checked In</h3>
            <p className="text-gray-600">
              Great! All volunteers who signed up for this event have checked in.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* No-Show Volunteers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>No-Show Volunteers ({noShowVolunteers.length})</span>
          </CardTitle>
          <CardDescription>
            These volunteers signed up but did not check in to the event
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {noShowVolunteers.map((volunteer) => (
              <div key={volunteer.volunteer_id} className="rounded-xl bg-red-50/50 backdrop-blur-sm ring-1 ring-red-100 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-stone-900 text-sm mb-1">{volunteer.volunteer_name}</h5>
                    <Badge variant="destructive" className="text-xs mt-1">No Show</Badge>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 shrink-0">Phone:</span>
                    <a href={`tel:${volunteer.volunteer_phone}`} className="text-umma-700 hover:text-umma-800 hover:underline">{volunteer.volunteer_phone}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 shrink-0">Role:</span>
                    <span className="text-stone-700">{volunteer.role_label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 shrink-0">Signed up:</span>
                    <span>{new Date(volunteer.signup_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Signup Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noShowVolunteers.map((volunteer) => (
                  <TableRow key={volunteer.volunteer_id}>
                    <TableCell className="font-medium">{volunteer.volunteer_name}</TableCell>
                    <TableCell>{volunteer.volunteer_phone}</TableCell>
                    <TableCell>{volunteer.role_label}</TableCell>
                    <TableCell>
                      {new Date(volunteer.signup_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">No Show</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Clean Up No-Shows Button */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isLoading || isCleaningUp}
                  className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Clean Up No-Shows</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirm Cleanup</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove {noShowVolunteers.length} no-show volunteer{noShowVolunteers.length !== 1 ? 's' : ''} 
                    from the contacts database? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">This will remove:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {noShowVolunteers.slice(0, 5).map((volunteer) => (
                        <li key={volunteer.volunteer_id}>
                          • {volunteer.volunteer_name} ({volunteer.volunteer_phone})
                        </li>
                      ))}
                      {noShowVolunteers.length > 5 && (
                        <li className="text-red-600">
                          ... and {noShowVolunteers.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={handleDialogClose}
                      disabled={isCleaningUp}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleCleanup}
                      disabled={isCleaningUp}
                    >
                      {isCleaningUp ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Cleaning Up...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Confirm Cleanup
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Results */}
      {cleanupResults && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Cleanup Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-green-800">
              <p><strong>Event:</strong> {cleanupResults.eventTitle}</p>
              <p><strong>No-Show Volunteers Processed:</strong> {cleanupResults.noShowCount}</p>
              <p><strong>Contacts Removed:</strong> {cleanupResults.removedContacts.length}</p>
              
              {cleanupResults.removedContacts.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Removed Contacts:</h4>
                  <ul className="text-sm space-y-1">
                    {cleanupResults.removedContacts.map((contact) => (
                      <li key={contact.id}>
                        • {contact.name} ({contact.phone})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NoShowCleanup;
