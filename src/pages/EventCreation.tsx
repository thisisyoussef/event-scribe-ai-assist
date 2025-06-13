import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import Navigation from "@/components/Navigation";
import ItineraryEditor from "@/components/event-creation/ItineraryEditor";
import AdditionalDetailsWizard from "@/components/event-creation/AdditionalDetailsWizard";
import PreEventTasksManager from "@/components/event-creation/PreEventTasksManager";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles, Plus, Trash2, Clock, Users, MapPin, Calendar, TestTube, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EventCreation = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hideTestFeatures, setHideTestFeatures] = useState(true);
  
  // Event form data
  const [eventData, setEventData] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    smsEnabled: true,
    dayBeforeTime: "09:00",
    dayOfTime: "15:00",
    status: "draft"
  });

  // Enhanced features state (now always enabled)
  const [itinerary, setItinerary] = useState([]);
  const [additionalDetails, setAdditionalDetails] = useState({
    marketingLevel: '' as '' | 'low' | 'medium' | 'high',
    ageGroups: [] as string[],
    tone: '' as '' | 'formal' | 'casual' | 'fun',
    expectedAttendance: 50
  });

  // Pre-event tasks
  const [preEventTasks, setPreEventTasks] = useState([]);

  // AI suggestions and finalized roles
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [finalRoles, setFinalRoles] = useState([]);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
    };

    checkUser();
    loadContacts();

    // If editing, load event data from Supabase
    if (eventId) {
      loadEventData(eventId);
    }
  }, [navigate, eventId]);

  const loadContacts = async () => {
    try {
      // For now, we'll use a mock contacts array since we don't have a contacts table yet
      // In a full implementation, you'd fetch from Supabase
      const mockContacts = [
        { id: crypto.randomUUID(), name: "Ahmed Hassan", phone: "+1234567890" },
        { id: crypto.randomUUID(), name: "Fatima Ali", phone: "+1234567891" },
        { id: crypto.randomUUID(), name: "Omar Khan", phone: "+1234567892" }
      ];
      setContacts(mockContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadEventData = async (id: string) => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          volunteer_roles(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading event:', error);
        toast({
          title: "Error",
          description: "Failed to load event data.",
          variant: "destructive",
        });
        return;
      }

      if (eventData) {
        setEventData({
          title: eventData.title,
          date: eventData.start_datetime.split('T')[0],
          startTime: eventData.start_datetime.split('T')[1].slice(0, 5),
          endTime: eventData.end_datetime.split('T')[1].slice(0, 5),
          location: eventData.location,
          description: eventData.description || "",
          smsEnabled: eventData.sms_enabled || true,
          dayBeforeTime: eventData.day_before_time || "09:00",
          dayOfTime: eventData.day_of_time || "15:00",
          status: eventData.status as "draft" | "published"
        });

        // Convert volunteer_roles to finalRoles format
        const roles = eventData.volunteer_roles?.map((role: any) => ({
          id: role.id,
          roleLabel: role.role_label,
          shiftStart: role.shift_start,
          shiftEnd: role.shift_end,
          slotsBrother: role.slots_brother || 0,
          slotsSister: role.slots_sister || 0,
          suggestedPOC: role.suggested_poc,
          notes: role.notes || "",
          status: "accepted"
        })) || [];

        setFinalRoles(roles);
        setCurrentStep(roles.length > 0 ? getStepNumber(4) : 1);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load event data.",
        variant: "destructive",
      });
    }
  };

  const addTimeMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  // Helper function to get the actual step number based on hideTestFeatures
  const getStepNumber = (logicalStep: number) => {
    if (!hideTestFeatures) return logicalStep;
    
    // When hiding test features: 1 -> 1, 2 -> skip, 3 -> skip, 4 -> 2, 5 -> 3
    if (logicalStep <= 1) return 1;
    if (logicalStep >= 4) return logicalStep - 2;
    return logicalStep; // This shouldn't happen when features are hidden
  };

  // Helper function to get the logical step from display step
  const getLogicalStep = (displayStep: number) => {
    if (!hideTestFeatures) return displayStep;
    
    // When hiding test features: 1 -> 1, 2 -> 4, 3 -> 5
    if (displayStep === 1) return 1;
    if (displayStep === 2) return 4;
    if (displayStep === 3) return 5;
    return displayStep;
  };

  const getVisibleSteps = () => {
    const allSteps = [
      { number: 1, title: "Basic Info", description: "Event details" },
      { number: 2, title: "Enhanced Details", description: "Itinerary & preferences" },
      { number: 3, title: "Pre-Event Tasks", description: "Planning & assignments" },
      { number: 4, title: "Volunteer Slots", description: "AI suggestions & roles" },
      { number: 5, title: "Review & Publish", description: "Final settings" }
    ];

    if (hideTestFeatures) {
      return allSteps.filter(step => step.number !== 2 && step.number !== 3).map((step, index) => ({
        ...step,
        number: index + 1
      }));
    }
    
    return allSteps;
  };

  const steps = getVisibleSteps();

  const parseWithAI = async () => {
    setIsLoading(true);
    
    // Enhanced AI parsing using itinerary and additional details
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let mockSuggestions = [];
    
    // Always include standard roles for most events
    const standardRoles = [];
    
    // Setup role (4-8 people depending on scale)
    const setupCount = additionalDetails.expectedAttendance > 100 ? 8 : 4;
    standardRoles.push({
      id: crypto.randomUUID(),
      roleLabel: "Setup Team",
      shiftStart: addTimeMinutes(eventData.startTime, -60), // 1 hour before event
      shiftEnd: eventData.startTime,
      slotsBrother: Math.ceil(setupCount * 0.6),
      slotsSister: Math.floor(setupCount * 0.4),
      suggestedPOC: null,
      notes: "Setup tables, chairs, decorations, and equipment before the event"
    });

    // Cleanup role (mirrors setup)
    standardRoles.push({
      id: crypto.randomUUID(),
      roleLabel: "Cleanup Team",
      shiftStart: addTimeMinutes(eventData.endTime, -30),
      shiftEnd: addTimeMinutes(eventData.endTime, 60),
      slotsBrother: Math.ceil(setupCount * 0.6),
      slotsSister: Math.floor(setupCount * 0.4),
      suggestedPOC: null,
      notes: "Post-event cleanup, breakdown, and venue restoration"
    });

    // Check-in role (2 guys 2 girls)
    standardRoles.push({
      id: crypto.randomUUID(),
      roleLabel: "Registration & Check-in",
      shiftStart: addTimeMinutes(eventData.startTime, -15),
      shiftEnd: addTimeMinutes(eventData.startTime, 60),
      slotsBrother: 2,
      slotsSister: 2,
      suggestedPOC: null,
      notes: "Welcome guests, manage registration, and provide event information"
    });

    // Ushers/floaters (2-8 depending on scale)
    const usherCount = additionalDetails.expectedAttendance > 150 ? 8 : additionalDetails.expectedAttendance > 75 ? 4 : 2;
    standardRoles.push({
      id: crypto.randomUUID(),
      roleLabel: "Ushers & Floaters",
      shiftStart: eventData.startTime,
      shiftEnd: eventData.endTime,
      slotsBrother: Math.ceil(usherCount * 0.5),
      slotsSister: Math.floor(usherCount * 0.5),
      suggestedPOC: null,
      notes: "Assist guests, manage crowds, and provide general event support"
    });

    // Check if event likely involves food/drinks based on description or time
    const eventDescription = eventData.description.toLowerCase();
    const hasFood = eventDescription.includes('food') || eventDescription.includes('meal') || eventDescription.includes('dinner') || eventDescription.includes('lunch') || eventDescription.includes('iftar') || eventDescription.includes('breakfast');
    const hasDrinks = eventDescription.includes('drink') || eventDescription.includes('beverage') || eventDescription.includes('tea') || eventDescription.includes('coffee') || hasFood;
    
    // Add food serving if relevant
    if (hasFood) {
      const foodServers = additionalDetails.expectedAttendance > 100 ? 6 : 4;
      standardRoles.push({
        id: crypto.randomUUID(),
        roleLabel: "Food Service Team",
        shiftStart: addTimeMinutes(eventData.startTime, 30),
        shiftEnd: addTimeMinutes(eventData.endTime, -30),
        slotsBrother: Math.ceil(foodServers * 0.4),
        slotsSister: Math.floor(foodServers * 0.6),
        suggestedPOC: null,
        notes: "Serve meals, manage food lines, and maintain food presentation"
      });
    }

    // Add drink serving if relevant
    if (hasDrinks) {
      standardRoles.push({
        id: crypto.randomUUID(),
        roleLabel: "Beverage Service",
        shiftStart: eventData.startTime,
        shiftEnd: addTimeMinutes(eventData.endTime, -15),
        slotsBrother: 1,
        slotsSister: 2,
        suggestedPOC: null,
        notes: "Serve drinks, maintain beverage stations, and restock supplies"
      });
    }

    mockSuggestions = [...standardRoles];
    
    if (itinerary.length > 0) {
      // Generate additional detailed suggestions based on itinerary
      const itineraryRoles = itinerary
        .filter(item => !item.title.toLowerCase().includes('setup') && !item.title.toLowerCase().includes('cleanup'))
        .map(item => ({
          id: crypto.randomUUID(),
          roleLabel: `${item.title} Coordinator`,
          shiftStart: item.time,
          shiftEnd: addTimeMinutes(item.time, 60),
          slotsBrother: 1,
          slotsSister: 1,
          suggestedPOC: null,
          notes: item.description || `Coordinate and manage ${item.title.toLowerCase()} activities`
        }));

      mockSuggestions = [...mockSuggestions, ...itineraryRoles];
    }
    
    setAiSuggestions(mockSuggestions);
    setIsLoading(false);
    
    toast({
      title: "AI Parsing Complete!",
      description: `Generated ${mockSuggestions.length} role suggestions including standard event roles.`,
    });
  };

  const acceptSuggestion = (suggestion: any) => {
    setFinalRoles(prev => [...prev, { ...suggestion, status: "accepted" }]);
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const addCustomRole = () => {
    const newRole = {
      id: crypto.randomUUID(),
      roleLabel: "",
      shiftStart: eventData.startTime,
      shiftEnd: eventData.endTime,
      slotsBrother: 1,
      slotsSister: 0,
      suggestedPOC: null,
      notes: "",
      status: "custom"
    };
    setFinalRoles(prev => [...prev, newRole]);
  };

  const updateRole = (roleId: string, updates: any) => {
    setFinalRoles(prev => prev.map(role => 
      role.id === roleId ? { ...role, ...updates } : role
    ));
  };

  const removeRole = (roleId: string) => {
    setFinalRoles(prev => prev.filter(role => role.id !== roleId));
  };

  const publishEvent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create events.",
          variant: "destructive",
        });
        return;
      }

      console.log('Publishing event with final roles:', finalRoles);

      // Create or update the event
      const eventPayload = {
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start_datetime: `${eventData.date}T${eventData.startTime}:00`,
        end_datetime: `${eventData.date}T${eventData.endTime}:00`,
        sms_enabled: eventData.smsEnabled,
        day_before_time: eventData.dayBeforeTime,
        day_of_time: eventData.dayOfTime,
        status: "published",
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      let savedEventId = eventId;

      if (eventId) {
        // Update existing event
        const { error: eventError } = await supabase
          .from('events')
          .update(eventPayload)
          .eq('id', eventId);

        if (eventError) {
          console.error('Error updating event:', eventError);
          toast({
            title: "Error",
            description: "Failed to update event.",
            variant: "destructive",
          });
          return;
        }

        // Delete existing volunteer roles
        const { error: deleteRolesError } = await supabase
          .from('volunteer_roles')
          .delete()
          .eq('event_id', eventId);

        if (deleteRolesError) {
          console.error('Error deleting roles:', deleteRolesError);
        }
      } else {
        // Create new event
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert([eventPayload])
          .select()
          .single();

        if (eventError) {
          console.error('Error creating event:', eventError);
          toast({
            title: "Error",
            description: "Failed to create event.",
            variant: "destructive",
          });
          return;
        }

        savedEventId = newEvent.id;
      }

      // Insert volunteer roles
      if (finalRoles.length > 0) {
        const rolesPayload = finalRoles
          .filter(role => role.roleLabel && role.roleLabel.trim() !== '')
          .map(role => ({
            event_id: savedEventId,
            role_label: role.roleLabel,
            shift_start: role.shiftStart,
            shift_end: role.shiftEnd,
            slots_brother: role.slotsBrother || 0,
            slots_sister: role.slotsSister || 0,
            suggested_poc: null,
            notes: role.notes || ""
          }));

        console.log('Inserting roles payload:', rolesPayload);

        if (rolesPayload.length > 0) {
          const { error: rolesError } = await supabase
            .from('volunteer_roles')
            .insert(rolesPayload);

          if (rolesError) {
            console.error('Error creating roles:', rolesError);
            toast({
              title: "Error",
              description: "Failed to create volunteer roles.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      toast({
        title: "Event Published!",
        description: `${eventData.title} is now live and accepting volunteer sign-ups.`,
      });
      
      navigate("/dashboard");
    } catch (error) {
      console.error('Error publishing event:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const nextStep = () => {
    const maxStep = steps.length;
    if (currentStep < maxStep) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    const logicalStep = getLogicalStep(currentStep);
    switch (logicalStep) {
      case 1:
        return eventData.title && eventData.date && eventData.startTime && eventData.endTime && eventData.location;
      case 2:
        return true; // Enhanced details are optional
      case 3:
        return true; // Pre-event tasks are optional
      case 4:
        return finalRoles.every(role => role.roleLabel && role.roleLabel.trim() !== '' && (role.slotsBrother > 0 || role.slotsSister > 0));
      default:
        return true;
    }
  };

  const prefillTestData = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    setEventData({
      title: "Community Iftar 2025",
      date: tomorrowString,
      startTime: "18:00",
      endTime: "21:00",
      location: "Muslim Community Center - Main Hall",
      description: "Join us for a community iftar dinner during Ramadan. We'll need volunteers to help with setup, registration, food service, and cleanup. The event will include a brief program after the meal. Setup should begin 2 hours before the event. We'll need brothers and sisters to help with various tasks including welcoming guests, managing the buffet line, and coordinating activities for children.",
      smsEnabled: true,
      dayBeforeTime: "09:00",
      dayOfTime: "15:00",
      status: "draft"
    });

    // Prefill itinerary
    setItinerary([
      { id: crypto.randomUUID(), time: "16:00", title: "Setup & Preparation", description: "Tables, chairs, decorations setup" },
      { id: crypto.randomUUID(), time: "17:30", title: "Volunteer Briefing", description: "Brief all volunteers on their roles" },
      { id: crypto.randomUUID(), time: "18:00", title: "Guest Registration", description: "Welcome and check-in guests" },
      { id: crypto.randomUUID(), time: "19:30", title: "Maghrib Prayer", description: "Community prayer time" },
      { id: crypto.randomUUID(), time: "19:45", title: "Iftar Dinner Service", description: "Serve meals to community" },
      { id: crypto.randomUUID(), time: "20:30", title: "Community Program", description: "Brief talks and announcements" },
      { id: crypto.randomUUID(), time: "21:00", title: "Cleanup & Breakdown", description: "Clean venue and pack up" }
    ]);

    // Prefill additional details
    setAdditionalDetails({
      marketingLevel: 'medium',
      ageGroups: ['adults', 'families'],
      tone: 'casual',
      expectedAttendance: 150
    });

    toast({
      title: "Test data loaded!",
      description: "Form has been filled with sample event data including itinerary.",
    });
  };

  const logicalCurrentStep = getLogicalStep(currentStep);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header with Steps */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} 
              className="text-umma-800 hover:bg-umma-100">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-umma-900">
              {eventId ? "Edit Event" : "Create New Event"}
            </h1>
            
            {/* Test Features Toggle */}
            <div className="flex items-center space-x-2">
              <Toggle
                pressed={hideTestFeatures}
                onPressedChange={setHideTestFeatures}
                className="data-[state=on]:bg-umma-600 data-[state=on]:text-white"
              >
                {hideTestFeatures ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              </Toggle>
            </div>
          </div>
          
          {/* Step Indicator */}
          <div className="flex flex-wrap items-center gap-4 mb-6 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.number 
                    ? "bg-umma-600 text-white" 
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {step.number}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className="text-sm font-medium text-umma-800">{step.title}</div>
                  <div className="text-xs text-umma-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-4 hidden sm:block ${
                    currentStep > step.number ? "bg-umma-600" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-white border-umma-200">
          <CardContent className="p-4 sm:p-6">
            {/* Step 1: Basic Info */}
            {logicalCurrentStep === 1 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-semibold text-umma-800">Event Information</h2>
                  {!eventId && (
                    <Button 
                      variant="outline" 
                      onClick={prefillTestData}
                      className="text-sm w-full sm:w-auto bg-gradient-to-r from-umma-400 to-umma-500 hover:from-umma-500 hover:to-umma-600 text-white border-umma-300 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Prefill with Test Data
                    </Button>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={eventData.title}
                      onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Community Iftar 2025"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">Event Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={eventData.date}
                      onChange={(e) => setEventData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={eventData.startTime}
                      onChange={(e) => setEventData(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={eventData.endTime}
                      onChange={(e) => setEventData(prev => ({ ...prev, endTime: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={eventData.location}
                      onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Muslim Community Center"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Event Description</Label>
                    <Textarea
                      id="description"
                      value={eventData.description}
                      onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your event, mention roles needed, timing requirements, and any specific instructions..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Enhanced Details - Only show when hideTestFeatures is false */}
            {logicalCurrentStep === 2 && !hideTestFeatures && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-umma-800">Enhanced Event Details</h2>
                <p className="text-gray-600 mb-6">
                  Add detailed itinerary and preferences to help AI generate more precise volunteer roles and pre-event tasks.
                </p>
                
                <ItineraryEditor
                  itinerary={itinerary}
                  onItineraryChange={setItinerary}
                  startTime={eventData.startTime}
                  endTime={eventData.endTime}
                />
                
                <AdditionalDetailsWizard
                  details={additionalDetails}
                  onDetailsChange={setAdditionalDetails}
                  isExpanded={true}
                  onToggleExpand={() => {}}
                />
              </div>
            )}

            {/* Step 3: Pre-Event Tasks - Only show when hideTestFeatures is false */}
            {logicalCurrentStep === 3 && !hideTestFeatures && (
              <PreEventTasksManager
                tasks={preEventTasks}
                onTasksChange={setPreEventTasks}
                contacts={contacts}
                eventDate={eventData.date}
                eventDescription={eventData.description}
              />
            )}

            {/* Step 4: Volunteer Slots */}
            {logicalCurrentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-umma-800">Volunteer Role Generation</h2>
                  <p className="text-umma-600 mb-6">
                    AI will analyze your itinerary and event details to generate tailored volunteer roles.
                  </p>
                  
                  {itinerary.length > 0 && (
                    <Card className="mb-4 border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-green-800 mb-2">Itinerary Preview:</h4>
                        <div className="space-y-1">
                          {itinerary.slice(0, 3).map((item) => (
                            <div key={item.id} className="text-sm text-green-700">
                              {item.time} - {item.title}
                            </div>
                          ))}
                          {itinerary.length > 3 && (
                            <div className="text-sm text-green-600">+ {itinerary.length - 3} more items</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {aiSuggestions.length === 0 && !isLoading && (
                    <div className="text-center py-6 sm:py-8">
                      <Sparkles className="w-12 h-12 text-umma-600 mx-auto mb-4" />
                      <Button 
                        onClick={parseWithAI}
                        className="w-full sm:w-auto bg-gradient-to-r from-umma-500 to-umma-700 hover:from-umma-600 hover:to-umma-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={!eventData.description}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Role Suggestions
                      </Button>
                      {!eventData.description && (
                        <p className="text-sm text-umma-500 mt-2">Add an event description first</p>
                      )}
                    </div>
                  )}

                  {isLoading && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-umma-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-umma-700">AI is analyzing your event description...</p>
                    </div>
                  )}

                  {aiSuggestions.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-umma-800">AI Suggestions:</h3>
                      {aiSuggestions.map((suggestion: any) => (
                        <Card key={suggestion.id} className="bg-white border-umma-200">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="flex-1">
                                <h4 className="font-medium text-umma-800">{suggestion.roleLabel}</h4>
                                <div className="text-sm text-umma-600 space-y-1 mt-2">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{suggestion.shiftStart} - {suggestion.shiftEnd}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4" />
                                    <span>
                                      {suggestion.slotsBrother} brothers, {suggestion.slotsSister} sisters
                                    </span>
                                  </div>
                                  {suggestion.notes && (
                                    <p className="text-umma-500 mt-2">{suggestion.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2 sm:ml-4 w-full sm:w-auto">
                                <Button 
                                  size="sm"
                                  onClick={() => acceptSuggestion(suggestion)}
                                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                  Accept
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {finalRoles.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h3 className="font-medium text-umma-800">Finalized Roles:</h3>
                      {finalRoles.map((role: any) => (
                        <Card key={role.id} className="bg-white border-umma-200">
                          <CardContent className="p-4">
                            <div className="grid gap-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-umma-700">Role Name</Label>
                                  <Input
                                    value={role.roleLabel}
                                    onChange={(e) => updateRole(role.id, { roleLabel: e.target.value })}
                                    placeholder="Role name"
                                    className="border-umma-200 focus-visible:ring-umma-500"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-umma-700">Shift Time</Label>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                      type="time"
                                      value={role.shiftStart}
                                      onChange={(e) => updateRole(role.id, { shiftStart: e.target.value })}
                                      className="border-umma-200 focus-visible:ring-umma-500"
                                    />
                                    <Input
                                      type="time"
                                      value={role.shiftEnd}
                                      onChange={(e) => updateRole(role.id, { shiftEnd: e.target.value })}
                                      className="border-umma-200 focus-visible:ring-umma-500"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-umma-700">Slots Needed</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={role.slotsBrother}
                                        onChange={(e) => updateRole(role.id, { slotsBrother: parseInt(e.target.value) || 0 })}
                                        placeholder="Brothers"
                                        className="border-umma-200 focus-visible:ring-umma-500"
                                      />
                                      <div className="text-xs text-umma-500 mt-1">Brothers</div>
                                    </div>
                                    <div>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={role.slotsSister}
                                        onChange={(e) => updateRole(role.id, { slotsSister: parseInt(e.target.value) || 0 })}
                                        placeholder="Sisters"
                                        className="border-umma-200 focus-visible:ring-umma-500"
                                      />
                                      <div className="text-xs text-umma-500 mt-1">Sisters</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-umma-700">Point of Contact</Label>
                                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                                    <div className="flex-1">
                                      <Select 
                                        value={role.suggestedPOC || ""} 
                                        onValueChange={(value) => updateRole(role.id, { suggestedPOC: value })}
                                      >
                                        <SelectTrigger className="border-umma-200">
                                          <SelectValue placeholder="Select POC" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {contacts.map((contact: any) => (
                                            <SelectItem key={contact.id} value={contact.id}>
                                              {contact.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => removeRole(role.id)}
                                      className="border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-umma-700">Notes (Optional)</Label>
                                <Input
                                  value={role.notes}
                                  onChange={(e) => updateRole(role.id, { notes: e.target.value })}
                                  placeholder="Special instructions or requirements"
                                  className="border-umma-200 focus-visible:ring-umma-500"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={addCustomRole}
                    className="w-full mt-4 bg-gradient-to-r from-umma-500 to-umma-600 hover:from-umma-600 hover:to-umma-700 text-white border-umma-300 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Role
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Review & Publish */}
            {logicalCurrentStep === 5 && (
              <div className="space-y-6">
                {/* Event Summary */}
                <Card className="mb-6 bg-white border-umma-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center space-x-2 text-umma-800">
                      <Calendar className="w-5 h-5" />
                      <span>Event Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-umma-800">{eventData.title}</h4>
                        <div className="text-sm text-umma-600 space-y-2 mt-3">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-umma-700" />
                            <span>{new Date(eventData.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-umma-700" />
                            <span>{eventData.startTime} - {eventData.endTime}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-umma-700" />
                            <span>{eventData.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h5 className="font-medium text-umma-800">Volunteer Roles</h5>
                        {finalRoles.length > 0 ? (
                          <div className="space-y-2">
                            {finalRoles.map((role: any) => (
                              <div key={role.id} className="text-sm text-umma-600 flex items-center gap-2">
                                <Users className="w-3 h-3 text-umma-700 flex-shrink-0" />
                                <span>{role.roleLabel}: {role.slotsBrother + role.slotsSister} slots</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-umma-500">No volunteer roles defined yet</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SMS Settings */}
                <Card className="bg-white border-umma-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-umma-800">SMS Reminder Settings</CardTitle>
                    <CardDescription className="text-umma-600">
                      Configure automatic reminders for volunteers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <Label className="text-umma-700">Enable SMS Reminders</Label>
                        <p className="text-sm text-umma-500">Send automatic reminders to volunteers</p>
                      </div>
                      <Switch
                        checked={eventData.smsEnabled}
                        onCheckedChange={(checked) => setEventData(prev => ({ ...prev, smsEnabled: checked }))}
                      />
                    </div>
                    
                    {eventData.smsEnabled && (
                      <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-umma-100">
                        <div className="space-y-2">
                          <Label className="text-umma-700">Day Before Reminder</Label>
                          <Input
                            type="time"
                            value={eventData.dayBeforeTime}
                            onChange={(e) => setEventData(prev => ({ ...prev, dayBeforeTime: e.target.value }))}
                            className="border-umma-200 focus-visible:ring-umma-500"
                          />
                          <p className="text-xs text-umma-500">Time to send reminder the day before</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-umma-700">Day Of Reminder</Label>
                          <Input
                            type="time"
                            value={eventData.dayOfTime}
                            onChange={(e) => setEventData(prev => ({ ...prev, dayOfTime: e.target.value }))}
                            className="border-umma-200 focus-visible:ring-umma-500"
                          />
                          <p className="text-xs text-umma-500">Time to send reminder on event day</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="w-full sm:w-auto border-umma-300 text-umma-700 hover:bg-umma-100"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex w-full sm:w-auto">
            {currentStep === steps.length ? (
              <Button 
                onClick={publishEvent}
                className="w-full bg-gradient-to-r from-umma-500 to-umma-700 hover:from-umma-600 hover:to-umma-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={!canProceed()}
              >
                {eventId ? "Update Event" : "Publish Event"}
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full bg-gradient-to-r from-umma-500 to-umma-600 hover:from-umma-600 hover:to-umma-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventCreation;
