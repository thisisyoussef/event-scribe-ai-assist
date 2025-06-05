
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useParams } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, Phone, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VolunteerSignup = () => {
  const { eventId } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [volunteerData, setVolunteerData] = useState({
    name: "",
    phone: "",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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
  }, [eventId]);

  const getVolunteersForRole = (roleId: string) => {
    return event?.volunteers?.filter((v: any) => v.roleId === roleId) || [];
  };

  const getRemainingSlots = (role: any) => {
    const volunteers = getVolunteersForRole(role.id);
    const totalSlots = (role.slotsBrother || 0) + (role.slotsSister || 0);
    return totalSlots - volunteers.length;
  };

  const getPOCInfo = (pocId: string) => {
    return contacts.find((c: any) => c.id === pocId);
  };

  const openSignupModal = (role: any) => {
    const remaining = getRemainingSlots(role);
    if (remaining <= 0) {
      toast({
        title: "Role Full",
        description: "This role is currently full. Please check other available roles.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedRole(role);
    setVolunteerData({ name: "", phone: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!volunteerData.name || !volunteerData.phone) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and phone number.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(volunteerData.phone.replace(/[\s\-\(\)]/g, ''))) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const newVolunteer = {
      id: Date.now().toString(),
      roleId: selectedRole.id,
      name: volunteerData.name,
      phone: volunteerData.phone,
      notes: volunteerData.notes,
      signupDate: new Date().toISOString(),
      status: "confirmed"
    };

    // Update event with new volunteer
    const savedEvents = localStorage.getItem("events");
    if (savedEvents) {
      const events = JSON.parse(savedEvents);
      const updatedEvents = events.map((e: any) => {
        if (e.id === eventId) {
          return {
            ...e,
            volunteers: [...(e.volunteers || []), newVolunteer]
          };
        }
        return e;
      });
      
      localStorage.setItem("events", JSON.stringify(updatedEvents));
      
      // Update local state
      setEvent(prev => ({
        ...prev,
        volunteers: [...(prev?.volunteers || []), newVolunteer]
      }));
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    
    toast({
      title: "Successfully Signed Up!",
      description: `You're now registered for ${selectedRole.roleLabel}. You should receive a confirmation SMS shortly.`,
    });

    // Simulate SMS confirmation
    console.log(`SMS would be sent to ${volunteerData.phone}: Thanks ${volunteerData.name}! You're signed up as ${selectedRole.roleLabel} on ${new Date(event?.startDatetime).toLocaleDateString()} at ${selectedRole.shiftStart}-${selectedRole.shiftEnd}.`);
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-gray-600">The event you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              VolunTech
            </h1>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Event Description */}
        {event.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>About This Event</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{event.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Volunteer Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Available Volunteer Roles</CardTitle>
            <CardDescription>
              Choose a role that fits your schedule and sign up to help make this event successful!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {event.roles && event.roles.length > 0 ? (
              <div className="space-y-4">
                {event.roles.map((role: any) => {
                  const volunteers = getVolunteersForRole(role.id);
                  const totalSlots = (role.slotsBrother || 0) + (role.slotsSister || 0);
                  const remainingSlots = getRemainingSlots(role);
                  const pocInfo = role.suggestedPOC ? getPOCInfo(role.suggestedPOC) : null;
                  
                  return (
                    <Card key={role.id} className={`${remainingSlots === 0 ? 'opacity-75' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-semibold">{role.roleLabel}</h3>
                              <Badge variant={remainingSlots > 0 ? "default" : "secondary"}>
                                {remainingSlots > 0 ? `${remainingSlots} slots open` : "Full"}
                              </Badge>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{role.shiftStart} - {role.shiftEnd}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4" />
                                  <span>{volunteers.length} / {totalSlots} volunteers signed up</span>
                                </div>
                              </div>
                              
                              {pocInfo && (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Phone className="w-4 h-4" />
                                    <span>Contact: {pocInfo.name}</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {pocInfo.phone}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {role.notes && (
                              <p className="text-sm text-gray-600 mt-3 italic">
                                {role.notes}
                              </p>
                            )}
                          </div>
                          
                          <div className="ml-6">
                            <Button
                              onClick={() => openSignupModal(role)}
                              disabled={remainingSlots === 0}
                              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {remainingSlots === 0 ? "Full" : "Sign Up"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Roles Available</h3>
                <p className="text-gray-500">Volunteer roles for this event haven't been set up yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign-up Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign Up for {selectedRole?.roleLabel}</DialogTitle>
              <DialogDescription>
                Fill in your information to register for this volunteer role.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={volunteerData.name}
                  onChange={(e) => setVolunteerData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={volunteerData.phone}
                  onChange={(e) => setVolunteerData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
                <p className="text-xs text-gray-500">
                  Used for event reminders and communication
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requirements, questions, or information..."
                  value={volunteerData.notes}
                  onChange={(e) => setVolunteerData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {selectedRole && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Role Details:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Time:</strong> {selectedRole.shiftStart} - {selectedRole.shiftEnd}</p>
                    <p><strong>Date:</strong> {new Date(event?.startDatetime).toLocaleDateString()}</p>
                    <p><strong>Location:</strong> {event?.location}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Signing Up...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Sign Me Up!
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default VolunteerSignup;
