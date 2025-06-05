
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Users, Calendar, Clock, MapPin, MessageSquare, Copy, Edit, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EventRoster = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messageModal, setMessageModal] = useState({ open: false, volunteer: null, message: "" });
  const [announcementModal, setAnnouncementModal] = useState({ open: false, message: "", selectedRoles: [] });

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }

    // Load event data
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
      const events = JSON.parse(savedEvents);
      const foundEvent = events.find((e: any) => e.id === eventId);
      if (foundEvent) {
        setEvent(foundEvent);
      }
    }

    // Load contacts
    const savedContacts = localStorage.getItem("contacts");
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, [navigate, eventId]);

  const getVolunteersForRole = (roleId: string) => {
    return event?.volunteers?.filter((v: any) => v.roleId === roleId) || [];
  };

  const getPOCInfo = (pocId: string) => {
    return contacts.find((c: any) => c.id === pocId);
  };

  const copySignupLink = () => {
    const link = `${window.location.origin}/event/${eventId}/signup`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Volunteer sign-up link copied to clipboard.",
    });
  };

  const removeVolunteer = (volunteerId: string) => {
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
      const events = JSON.parse(savedEvents);
      const updatedEvents = events.map((e: any) => {
        if (e.id === eventId) {
          return {
            ...e,
            volunteers: e.volunteers?.filter((v: any) => v.id !== volunteerId) || []
          };
        }
        return e;
      });
      
      localStorage.setItem("events", JSON.stringify(updatedEvents));
      setEvent(prev => ({
        ...prev,
        volunteers: prev?.volunteers?.filter((v: any) => v.id !== volunteerId) || []
      }));
    }

    toast({
      title: "Volunteer Removed",
      description: "The volunteer has been removed from this role.",
    });
  };

  const sendMessage = (volunteer: any) => {
    console.log(`SMS would be sent to ${volunteer.phone}: ${messageModal.message}`);
    toast({
      title: "Message Sent",
      description: `Your message has been sent to ${volunteer.name}.`,
    });
    setMessageModal({ open: false, volunteer: null, message: "" });
  };

  const sendAnnouncement = () => {
    const selectedVolunteers = event?.volunteers?.filter((v: any) => 
      announcementModal.selectedRoles.length === 0 || 
      announcementModal.selectedRoles.includes(v.roleId)
    ) || [];

    console.log(`Announcement would be sent to ${selectedVolunteers.length} volunteers: ${announcementModal.message}`);
    
    toast({
      title: "Announcement Sent",
      description: `Your announcement has been sent to ${selectedVolunteers.length} volunteers.`,
    });
    setAnnouncementModal({ open: false, message: "", selectedRoles: [] });
  };

  const exportRoster = () => {
    if (!event) return;
    
    let csvContent = "Role,Volunteer Name,Phone Number,Notes,Signup Date\n";
    
    event.roles?.forEach((role: any) => {
      const volunteers = getVolunteersForRole(role.id);
      if (volunteers.length === 0) {
        csvContent += `"${role.roleLabel}","(Empty slot)","","",""\n`;
      } else {
        volunteers.forEach((volunteer: any) => {
          csvContent += `"${role.roleLabel}","${volunteer.name}","${volunteer.phone}","${volunteer.notes || ''}","${new Date(volunteer.signupDate).toLocaleDateString()}"\n`;
        });
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_roster.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Roster Exported",
      description: "The volunteer roster has been downloaded as a CSV file.",
    });
  };

  const getTotalSlots = () => {
    return event?.roles?.reduce((sum: number, role: any) => 
      sum + (role.slotsBrother || 0) + (role.slotsSister || 0), 0) || 0;
  };

  const getFilledSlots = () => {
    return event?.volunteers?.length || 0;
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
              <p className="text-gray-600">The event you're looking for doesn't exist.</p>
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
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600 mt-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(event.startDatetime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(event.startDatetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                    {new Date(event.endDatetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => navigate(`/events/${eventId}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
              <Button variant="outline" onClick={copySignupLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Sign-up Link
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalSlots()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed Up</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getFilledSlots()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Slots</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalSlots() - getFilledSlots()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fill Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getTotalSlots() > 0 ? Math.round((getFilledSlots() / getTotalSlots()) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Dialog 
            open={announcementModal.open} 
            onOpenChange={(open) => setAnnouncementModal(prev => ({ ...prev, open }))}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Announcement</DialogTitle>
                <DialogDescription>
                  Send a message to all volunteers or specific roles
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Type your announcement message..."
                    value={announcementModal.message}
                    onChange={(e) => setAnnouncementModal(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setAnnouncementModal({ open: false, message: "", selectedRoles: [] })}>
                    Cancel
                  </Button>
                  <Button onClick={sendAnnouncement} disabled={!announcementModal.message}>
                    Send to All Volunteers
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={exportRoster}>
            <Download className="w-4 h-4 mr-2" />
            Export Roster
          </Button>
        </div>

        {/* Roster by Role */}
        <div className="space-y-6">
          {event.roles?.map((role: any) => {
            const volunteers = getVolunteersForRole(role.id);
            const totalSlots = (role.slotsBrother || 0) + (role.slotsSister || 0);
            const pocInfo = role.suggestedPOC ? getPOCInfo(role.suggestedPOC) : null;
            
            return (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-3">
                        <span>{role.roleLabel}</span>
                        <Badge variant={volunteers.length === totalSlots ? "default" : "secondary"}>
                          {volunteers.length} / {totalSlots} filled
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="flex items-center space-x-4 text-sm">
                          <span>📅 {role.shiftStart} - {role.shiftEnd}</span>
                          {pocInfo && <span>📞 Contact: {pocInfo.name} ({pocInfo.phone})</span>}
                        </div>
                        {role.notes && <p className="text-sm text-gray-600 italic">{role.notes}</p>}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {volunteers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No volunteers signed up yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4 font-medium">Volunteer</th>
                            <th className="text-left py-2 px-4 font-medium">Phone</th>
                            <th className="text-left py-2 px-4 font-medium">Notes</th>
                            <th className="text-left py-2 px-4 font-medium">Signed Up</th>
                            <th className="text-left py-2 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {volunteers.map((volunteer: any) => (
                            <tr key={volunteer.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Users className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <span className="font-medium">{volunteer.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">{volunteer.phone}</td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-600">
                                  {volunteer.notes || "—"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-500">
                                  {new Date(volunteer.signupDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setMessageModal({ 
                                      open: true, 
                                      volunteer, 
                                      message: "" 
                                    })}
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeVolunteer(volunteer.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Show empty slots */}
                  {volunteers.length < totalSlots && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {totalSlots - volunteers.length} open slot{totalSlots - volunteers.length !== 1 ? 's' : ''} remaining
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Message Modal */}
        <Dialog 
          open={messageModal.open} 
          onOpenChange={(open) => setMessageModal(prev => ({ ...prev, open }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message to {messageModal.volunteer?.name}</DialogTitle>
              <DialogDescription>
                Send a direct SMS to this volunteer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Type your message..."
                  value={messageModal.message}
                  onChange={(e) => setMessageModal(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setMessageModal({ open: false, volunteer: null, message: "" })}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => sendMessage(messageModal.volunteer)} 
                  disabled={!messageModal.message}
                >
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default EventRoster;
