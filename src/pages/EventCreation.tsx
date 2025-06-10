import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Navigation from "@/components/Navigation";
import ItineraryEditor from "@/components/event-creation/ItineraryEditor";
import AdditionalDetailsWizard from "@/components/event-creation/AdditionalDetailsWizard";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, Plus, Trash2, Clock, Users, MapPin, Calendar, TestTube, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EventCreation = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useAdvancedFeatures, setUseAdvancedFeatures] = useState(false);
  
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

  // New advanced features state
  const [itinerary, setItinerary] = useState([]);
  const [additionalDetails, setAdditionalDetails] = useState({
    marketingLevel: '' as '' | 'low' | 'medium' | 'high',
    ageGroups: [] as string[],
    tone: '' as '' | 'formal' | 'casual' | 'fun',
    expectedAttendance: 50
  });
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

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
      // Load teams from the database instead of mock data
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading teams:', error);
        return;
      }

      // Convert teams to contacts format for backward compatibility
      const teamContacts = teamsData?.map(team => ({
        id: team.id,
        name: team.name,
        phone: team.phone
      })) || [];

      setContacts(teamContacts);
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
          volunteer_roles(*),
          itineraries(*),
          additional_details(*)
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

        // Load itinerary if exists
        if (eventData.itineraries && eventData.itineraries.length > 0) {
          const loadedItinerary = eventData.itineraries.map((item: any) => ({
            id: item.id,
            time: item.time_slot,
            title: item.title,
            description: item.description || ""
          }));
          setItinerary(loadedItinerary);
        }

        // Load additional details if exists
        if (eventData.additional_details && eventData.additional_details.length > 0) {
          const details = eventData.additional_details[0];
          setAdditionalDetails({
            marketingLevel: details.marketing_level || '',
            ageGroups: details.age_groups || [],
            tone: details.tone || '',
            expectedAttendance: details.attendance_estimate || 50
          });
        }

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
        setCurrentStep(roles.length > 0 ? 3 : 1);
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

  const steps = useAdvancedFeatures ? [
    { number: 1, title: "Basic Info", description: "Event details" },
    { number: 2, title: "Enhanced Details", description: "Itinerary & AI tuning" },
    { number: 3, title: "AI Parsing", description: "Generate roles" },
    { number: 4, title: "Volunteer Slots", description: "Finalize roles" },
    { number: 5, title: "Review & Publish", description: "Final settings" }
  ] : [
    { number: 1, title: "Basic Info", description: "Event details" },
    { number: 2, title: "AI Parsing", description: "Generate roles" },
    { number: 3, title: "Volunteer Slots", description: "Finalize roles" },
    { number: 4, title: "Review & Publish", description: "Final settings" }
  ];

  const parseWithAI = async () => {
    setIsLoading(true);
    
    // Enhanced AI parsing using itinerary and additional details
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let mockSuggestions = [];
    
    if (useAdvancedFeatures && itinerary.length > 0) {
      // Generate more detailed suggestions based on itinerary
      mockSuggestions = itinerary.map(item => ({
        id: crypto.randomUUID(),
        roleLabel: item.title, // Use the itinerary title directly instead of adding "Coordinator"
        shiftStart: item.time,
        shiftEnd: item.time.slice(0, 3) + String(Math.min(parseInt(item.time.slice(3)) + 60, 59)).padStart(2, '0'),
        slotsBrother: additionalDetails.expectedAttendance > 100 ? 3 : 2,
        slotsSister: additionalDetails.expectedAttendance > 100 ? 3 : 2,
        suggestedPOC: null,
        notes: item.description || `Handle ${item.title.toLowerCase()} activities`
      }));
      
      // Add general roles based on attendance
      if (additionalDetails.expectedAttendance > 50) {
        mockSuggestions.push({
          id: crypto.randomUUID(),
          roleLabel: "Event Support", // Changed from "Event Coordination"
          shiftStart: eventData.startTime,
          shiftEnd: eventData.endTime,
          slotsBrother: 1,
          slotsSister: 1,
          suggestedPOC: null,
          notes: "General event support and assistance"
        });
      }
    } else {
      // Fallback to original simple suggestions with better role names
      mockSuggestions = [
        {
          id: crypto.randomUUID(),
          roleLabel: "Setup Team", // Changed from "Event Setup"
          shiftStart: eventData.startTime,
          shiftEnd: eventData.startTime.slice(0, 3) + String(parseInt(eventData.startTime.slice(3)) + 30).padStart(2, '0'),
          slotsBrother: 4,
          slotsSister: 2,
          suggestedPOC: null,
          notes: "Setup tables, chairs, and decorations"
        },
        {
          id: crypto.randomUUID(),
          roleLabel: "Registration & Welcome", // Keep as is since it's already a good task name
          shiftStart: eventData.startTime,
          shiftEnd: eventData.endTime,
          slotsBrother: 2,
          slotsSister: 3,
          suggestedPOC: null,
          notes: "Check-in volunteers and guests"
        },
        {
          id: crypto.randomUUID(),
          roleLabel: "Cleanup Team", // Add a cleanup role
          shiftStart: eventData.endTime.slice(0, 3) + String(Math.max(parseInt(eventData.endTime.slice(3)) - 30, 0)).padStart(2, '0'),
          shiftEnd: eventData.endTime.slice(0, 3) + String(parseInt(eventData.endTime.slice(3)) + 30).padStart(2, '0'),
          slotsBrother: 3,
          slotsSister: 2,
          suggestedPOC: null,
          notes: "Post-event cleanup and breakdown"
        }
      ];
    }
    
    setAiSuggestions(mockSuggestions);
    setIsLoading(false);
    
    toast({
      title: "AI Parsing Complete!",
      description: `Generated ${mockSuggestions.length} role suggestions${useAdvancedFeatures ? ' using your detailed itinerary' : ''}.`,
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
      suggestedPOC: null, // Set to null to avoid foreign key issues
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

        // Delete existing related data
        await Promise.all([
          supabase.from('volunteer_roles').delete().eq('event_id', eventId),
          supabase.from('itineraries').delete().eq('event_id', eventId),
          supabase.from('additional_details').delete().eq('event_id', eventId)
        ]);
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

      // Save itinerary if using advanced features
      if (useAdvancedFeatures && itinerary.length > 0) {
        const itineraryPayload = itinerary.map(item => ({
          event_id: savedEventId,
          time_slot: item.time,
          title: item.title,
          description: item.description
        }));

        const { error: itineraryError } = await supabase
          .from('itineraries')
          .insert(itineraryPayload);

        if (itineraryError) {
          console.error('Error saving itinerary:', itineraryError);
        }
      }

      // Save additional details if using advanced features
      if (useAdvancedFeatures && (additionalDetails.marketingLevel || additionalDetails.ageGroups.length > 0 || additionalDetails.tone)) {
        const additionalDetailsPayload = {
          event_id: savedEventId,
          marketing_level: additionalDetails.marketingLevel || null,
          age_groups: additionalDetails.ageGroups,
          tone: additionalDetails.tone || null,
          attendance_estimate: additionalDetails.expectedAttendance
        };

        const { error: detailsError } = await supabase
          .from('additional_details')
          .insert([additionalDetailsPayload]);

        if (detailsError) {
          console.error('Error saving additional details:', detailsError);
        }
      }

      // Insert volunteer roles - ensure suggested_poc is always null for now
      if (finalRoles.length > 0) {
        const rolesPayload = finalRoles
          .filter(role => role.roleLabel && role.roleLabel.trim() !== '') // Filter out empty roles
          .map(role => ({
            event_id: savedEventId,
            role_label: role.roleLabel,
            shift_start: role.shiftStart,
            shift_end: role.shiftEnd,
            slots_brother: role.slotsBrother || 0,
            slots_sister: role.slotsSister || 0,
            suggested_poc: null, // Always set to null to avoid foreign key constraint issues
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
    const maxStep = useAdvancedFeatures ? 5 : 4;
    if (currentStep < maxStep) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return eventData.title && eventData.date && eventData.startTime && eventData.endTime && eventData.location;
      case 2:
        if (useAdvancedFeatures) {
          return true; // Enhanced details are optional
        } else {
          return finalRoles.length > 0; // This is the AI parsing step for simple mode
        }
      case 3:
        if (useAdvancedFeatures) {
          return finalRoles.length > 0; // AI parsing step for advanced mode
        } else {
          return finalRoles.every(role => role.roleLabel && role.roleLabel.trim() !== '' && (role.slotsBrother > 0 || role.slotsSister > 0));
        }
      case 4:
        if (useAdvancedFeatures) {
          return finalRoles.every(role => role.roleLabel && role.roleLabel.trim() !== '' && (role.slotsBrother > 0 || role.slotsSister > 0));
        } else {
          return true; // Review step
        }
      default:
        return true;
    }
  };

  const getStepNumber = (logicalStep: string) => {
    if (!useAdvancedFeatures) {
      switch (logicalStep) {
        case 'ai-parsing': return 2;
        case 'volunteer-slots': return 3;
        case 'review': return 4;
        default: return currentStep;
      }
    } else {
      switch (logicalStep) {
        case 'ai-parsing': return 3;
        case 'volunteer-slots': return 4;
        case 'review': return 5;
        default: return currentStep;
      }
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

    toast({
      title: "Test data loaded!",
      description: "Form has been filled with sample event data for testing.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header with Steps */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {eventId ? "Edit Event" : "Create New Event"}
            </h1>
            
            {/* Advanced Features Toggle */}
            <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <Label className="text-sm font-medium">Enhanced AI Features</Label>
              <Switch
                checked={useAdvancedFeatures}
                onCheckedChange={setUseAdvancedFeatures}
              />
            </div>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center space-x-4 mb-6 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.number 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {step.number}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    currentStep > step.number ? "bg-blue-600" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Event Information</h2>
                  {!eventId && (
                    <Button 
                      variant="outline" 
                      onClick={prefillTestData}
                      className="text-sm"
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

            {/* Step 2: Enhanced Details (Advanced Mode) or AI Parsing (Simple Mode) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {useAdvancedFeatures ? (
                  <>
                    <h2 className="text-xl font-semibold mb-4">Enhanced Event Details</h2>
                    <p className="text-gray-600 mb-6">
                      Add detailed itinerary and preferences to help AI generate more precise volunteer roles and suggestions.
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
                      isExpanded={showAdditionalDetails}
                      onToggleExpand={setShowAdditionalDetails}
                    />
                  </>
                ) : (
                  <>
                    {/* Simple AI Parsing Step */}
                    <div>
                      <h2 className="text-xl font-semibold mb-4">AI-Assisted Role Generation</h2>
                      <p className="text-gray-600 mb-6">
                        Let AI analyze your event description to suggest volunteer roles, shift times, and slot requirements.
                      </p>
                      
                      {aiSuggestions.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                          <Zap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                          <Button 
                            onClick={parseWithAI}
                            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                            disabled={!eventData.description}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Parse Description with AI
                          </Button>
                          {!eventData.description && (
                            <p className="text-sm text-gray-500 mt-2">Add an event description first</p>
                          )}
                        </div>
                      )}

                      {isLoading && (
                        <div className="text-center py-8">
                          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                          <p>AI is analyzing your event description...</p>
                        </div>
                      )}

                      {aiSuggestions.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-medium">AI Suggestions:</h3>
                          {aiSuggestions.map((suggestion: any) => (
                            <Card key={suggestion.id} className="border-blue-200">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-medium">{suggestion.roleLabel}</h4>
                                    <div className="text-sm text-gray-600 space-y-1 mt-2">
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
                                        <p className="text-gray-500">{suggestion.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2 ml-4">
                                    <Button 
                                      size="sm"
                                      onClick={() => acceptSuggestion(suggestion)}
                                      className="bg-green-600 hover:bg-green-700"
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
                          <h3 className="font-medium">Selected Roles:</h3>
                          {finalRoles.map((role: any) => (
                            <Card key={role.id} className="border-green-200">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{role.roleLabel}</h4>
                                    <div className="text-sm text-gray-600">
                                      {role.shiftStart} - {role.shiftEnd} • {role.slotsBrother + role.slotsSister} slots
                                    </div>
                                  </div>
                                  <Badge variant="secondary">Selected</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        onClick={addCustomRole}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Custom Role
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* AI Parsing Step (Advanced Mode) */}
            {currentStep === getStepNumber('ai-parsing') && useAdvancedFeatures && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Enhanced AI Role Generation</h2>
                  <p className="text-gray-600 mb-6">
                    AI will analyze your itinerary, event details, and preferences to generate tailored volunteer roles.
                  </p>
                  
                  {/* Enhanced AI parsing display */}
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
                    <div className="text-center py-8">
                      <Zap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                      <Button 
                        onClick={parseWithAI}
                        className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                        disabled={!eventData.description}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Parse Description with AI
                      </Button>
                      {!eventData.description && (
                        <p className="text-sm text-gray-500 mt-2">Add an event description first</p>
                      )}
                    </div>
                  )}

                  {isLoading && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>AI is analyzing your event description...</p>
                    </div>
                  )}

                  {aiSuggestions.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-medium">AI Suggestions:</h3>
                      {aiSuggestions.map((suggestion: any) => (
                        <Card key={suggestion.id} className="border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium">{suggestion.roleLabel}</h4>
                                <div className="text-sm text-gray-600 space-y-1 mt-2">
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
                                    <p className="text-gray-500">{suggestion.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <Button 
                                  size="sm"
                                  onClick={() => acceptSuggestion(suggestion)}
                                  className="bg-green-600 hover:bg-green-700"
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
                      <h3 className="font-medium">Selected Roles:</h3>
                      {finalRoles.map((role: any) => (
                        <Card key={role.id} className="border-green-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{role.roleLabel}</h4>
                                <div className="text-sm text-gray-600">
                                  {role.shiftStart} - {role.shiftEnd} • {role.slotsBrother + role.slotsSister} slots
                                </div>
                              </div>
                              <Badge variant="secondary">Selected</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={addCustomRole}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Role
                  </Button>
                </div>
              </div>
            )}

            {/* Volunteer Slots Step */}
            {currentStep === getStepNumber('volunteer-slots') && (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Finalize Volunteer Slots</h2>
                  <p className="text-gray-600 mb-6">
                    Review and adjust your volunteer roles, shift times, and slot allocations.
                  </p>

                  <div className="space-y-4">
                    {finalRoles.map((role: any) => (
                      <Card key={role.id}>
                        <CardContent className="p-4">
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Role Name</Label>
                              <Input
                                value={role.roleLabel}
                                onChange={(e) => updateRole(role.id, { roleLabel: e.target.value })}
                                placeholder="Role name"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Shift Time</Label>
                              <div className="flex space-x-2">
                                <Input
                                  type="time"
                                  value={role.shiftStart}
                                  onChange={(e) => updateRole(role.id, { shiftStart: e.target.value })}
                                />
                                <Input
                                  type="time"
                                  value={role.shiftEnd}
                                  onChange={(e) => updateRole(role.id, { shiftEnd: e.target.value })}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Slots Needed</Label>
                              <div className="flex space-x-2">
                                <div>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={role.slotsBrother}
                                    onChange={(e) => updateRole(role.id, { slotsBrother: parseInt(e.target.value) || 0 })}
                                    placeholder="Brothers"
                                  />
                                  <div className="text-xs text-gray-500 mt-1">Brothers</div>
                                </div>
                                <div>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={role.slotsSister}
                                    onChange={(e) => updateRole(role.id, { slotsSister: parseInt(e.target.value) || 0 })}
                                    placeholder="Sisters"
                                  />
                                  <div className="text-xs text-gray-500 mt-1">Sisters</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Point of Contact</Label>
                              <div className="flex space-x-2">
                                <Select 
                                  value={role.suggestedPOC || ""} 
                                  onValueChange={(value) => updateRole(role.id, { suggestedPOC: value })}
                                >
                                  <SelectTrigger>
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeRole(role.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2 md:col-span-2 lg:col-span-4">
                              <Label>Notes (Optional)</Label>
                              <Input
                                value={role.notes}
                                onChange={(e) => updateRole(role.id, { notes: e.target.value })}
                                placeholder="Special instructions or requirements"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={addCustomRole}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Role
                  </Button>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-gray-600">
                      Total volunteer slots: {finalRoles.reduce((sum, role) => sum + role.slotsBrother + role.slotsSister, 0)}
                      <br />
                      Roles created: {finalRoles.length}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Review & Publish Step */}
            {currentStep === getStepNumber('review') && (
              <>
                {/* Event Summary */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Event Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium">{eventData.title}</h4>
                        <div className="text-sm text-gray-600 space-y-1 mt-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(eventData.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{eventData.startTime} - {eventData.endTime}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{eventData.location}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Volunteer Roles</h5>
                        <div className="space-y-1">
                          {finalRoles.map((role: any) => (
                            <div key={role.id} className="text-sm text-gray-600">
                              {role.roleLabel}: {role.slotsBrother + role.slotsSister} slots
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SMS Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>SMS Reminder Settings</CardTitle>
                    <CardDescription>
                      Configure automatic reminders for volunteers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable SMS Reminders</Label>
                        <p className="text-sm text-gray-500">Send automatic reminders to volunteers</p>
                      </div>
                      <Switch
                        checked={eventData.smsEnabled}
                        onCheckedChange={(checked) => setEventData(prev => ({ ...prev, smsEnabled: checked }))}
                      />
                    </div>
                    
                    {eventData.smsEnabled && (
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label>Day Before Reminder</Label>
                          <Input
                            type="time"
                            value={eventData.dayBeforeTime}
                            onChange={(e) => setEventData(prev => ({ ...prev, dayBeforeTime: e.target.value }))}
                          />
                          <p className="text-xs text-gray-500">Time to send reminder the day before</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Day Of Reminder</Label>
                          <Input
                            type="time"
                            value={eventData.dayOfTime}
                            onChange={(e) => setEventData(prev => ({ ...prev, dayOfTime: e.target.value }))}
                          />
                          <p className="text-xs text-gray-500">Time to send reminder on event day</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {currentStep === (useAdvancedFeatures ? 5 : 4) ? (
              <Button 
                onClick={publishEvent}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                disabled={!canProceed()}
              >
                {eventId ? "Update Event" : "Publish Event"}
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
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
