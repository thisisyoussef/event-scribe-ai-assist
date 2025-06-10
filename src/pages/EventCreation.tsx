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
            marketingLevel: (details.marketing_level as '' | 'low' | 'medium' | 'high') || '',
            ageGroups: details.age_groups || [],
            tone: (details.tone as '' | 'formal' | 'casual' | 'fun') || '',
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
      description: "Join us for a community iftar dinner during Ramadan. We'll need volunteers to help with setup, registration, food service, and cleanup. The event will include a brief program after the meal. Setup should begin at 4:00 PM to ensure everything is ready for the 6:00 PM start time.",
      smsEnabled: true,
      dayBeforeTime: "09:00",
      dayOfTime: "15:00",
      status: "draft"
    });

    if (useAdvancedFeatures) {
      setItinerary([
        { id: "1", time: "16:00", title: "Setup", description: "Tables, chairs, decorations" },
        { id: "2", time: "17:30", title: "Registration", description: "Check-in and welcome" },
        { id: "3", time: "18:00", title: "Iftar", description: "Breaking fast together" },
        { id: "4", time: "19:30", title: "Program", description: "Brief spiritual reflection" },
        { id: "5", time: "20:30", title: "Cleanup", description: "Pack up and clean" }
      ]);

      setAdditionalDetails({
        marketingLevel: 'medium',
        ageGroups: ['Adults (26-40)', 'Families'],
        tone: 'formal',
        expectedAttendance: 120
      });
    }

    toast({
      title: "Test Data Loaded",
      description: "Event form has been filled with sample data for testing.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-amber-800">
                  {eventId ? "Edit Event" : "Create New Event"}
                </h1>
                <div className="flex items-center space-x-2 text-sm">
                  <Switch
                    checked={useAdvancedFeatures}
                    onCheckedChange={setUseAdvancedFeatures}
                    className="data-[state=checked]:bg-amber-500"
                  />
                  <Label className="text-amber-700">Advanced Features</Label>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={prefillTestData}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Fill Test Data
              </Button>
            </div>
            
            {/* Progress */}
            <div className="flex items-center justify-between mb-6">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.number
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="ml-3 hidden md:block">
                    <div className="text-sm font-medium text-amber-800">{step.title}</div>
                    <div className="text-xs text-amber-600">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4 h-px bg-amber-200 hidden md:block"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className="bg-white/90 backdrop-blur-sm border-amber-200 shadow-xl">
            <CardContent className="p-6">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-amber-800 mb-4">Event Details</h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Event Title</Label>
                      <Input
                        id="title"
                        value={eventData.title}
                        onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Community Iftar 2025"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={eventData.location}
                        onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., Community Center - Main Hall"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={eventData.description}
                      onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your event, activities, and any special instructions..."
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Enhanced Details (Advanced Mode) / AI Parsing (Simple Mode) */}
              {currentStep === 2 && useAdvancedFeatures && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-amber-800 mb-4">Enhanced Event Details</h2>
                    <p className="text-amber-600 mb-6">
                      Add detailed itinerary and preferences to help AI generate better volunteer roles.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-amber-800 mb-3">Event Itinerary</h3>
                      <ItineraryEditor 
                        itinerary={itinerary}
                        onItineraryChange={setItinerary}
                        startTime={eventData.startTime}
                        endTime={eventData.endTime}
                      />
                    </div>

                    <div className="border-t border-amber-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-amber-800">Additional Details</h3>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          {showAdditionalDetails ? 'Hide' : 'Show'} Details
                        </Button>
                      </div>

                      {showAdditionalDetails && (
                        <AdditionalDetailsWizard
                          details={additionalDetails}
                          onDetailsChange={setAdditionalDetails}
                          isExpanded={showAdditionalDetails}
                          onToggleExpand={setShowAdditionalDetails}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Parsing Step */}
              {((currentStep === 2 && !useAdvancedFeatures) || (currentStep === 3 && useAdvancedFeatures)) && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-amber-800 mb-4">AI Role Generation</h2>
                    <p className="text-amber-600 mb-6">
                      {useAdvancedFeatures 
                        ? "Generate volunteer roles based on your event details, itinerary, and preferences."
                        : "Generate volunteer roles based on your event description."
                      }
                    </p>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={parseWithAI}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-3 text-lg"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Generating Roles...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-3" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>

                  {/* AI Suggestions */}
                  {aiSuggestions.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-amber-800">AI Suggestions</h3>
                      {aiSuggestions.map((suggestion) => (
                        <Card key={suggestion.id} className="border-amber-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-amber-800">{suggestion.roleLabel}</h4>
                                <div className="flex items-center space-x-4 text-sm text-amber-600 mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{suggestion.shiftStart} - {suggestion.shiftEnd}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{suggestion.slotsBrother}B / {suggestion.slotsSister}S</span>
                                  </div>
                                </div>
                                <p className="text-sm text-amber-700 mt-2">{suggestion.notes}</p>
                              </div>
                              <Button
                                onClick={() => acceptSuggestion(suggestion)}
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                              >
                                Accept
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Accepted Roles Preview */}
                  {finalRoles.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-amber-800">Accepted Roles</h3>
                      {finalRoles.map((role) => (
                        <Card key={role.id} className="border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-green-800">{role.roleLabel}</h4>
                                <div className="flex items-center space-x-4 text-sm text-green-600 mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{role.shiftStart} - {role.shiftEnd}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{role.slotsBrother}B / {role.slotsSister}S</span>
                                  </div>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                ✓ Accepted
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Volunteer Slots Step */}
              {((currentStep === 3 && !useAdvancedFeatures) || (currentStep === 4 && useAdvancedFeatures)) && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-amber-800 mb-2">Volunteer Slots</h2>
                      <p className="text-amber-600">Fine-tune your volunteer roles and slot requirements.</p>
                    </div>
                    <Button
                      onClick={addCustomRole}
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Role
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {finalRoles.map((role, index) => (
                      <Card key={role.id} className="border-amber-200">
                        <CardContent className="p-4">
                          <div className="grid md:grid-cols-12 gap-4 items-start">
                            <div className="md:col-span-3">
                              <Label htmlFor={`role-${index}`}>Role Name</Label>
                              <Input
                                id={`role-${index}`}
                                value={role.roleLabel}
                                onChange={(e) => updateRole(role.id, { roleLabel: e.target.value })}
                                placeholder="Enter role name"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <Label htmlFor={`start-${index}`}>Start Time</Label>
                              <Input
                                id={`start-${index}`}
                                type="time"
                                value={role.shiftStart}
                                onChange={(e) => updateRole(role.id, { shiftStart: e.target.value })}
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <Label htmlFor={`end-${index}`}>End Time</Label>
                              <Input
                                id={`end-${index}`}
                                type="time"
                                value={role.shiftEnd}
                                onChange={(e) => updateRole(role.id, { shiftEnd: e.target.value })}
                              />
                            </div>
                            
                            <div className="md:col-span-1">
                              <Label htmlFor={`brother-${index}`}>Brothers</Label>
                              <Input
                                id={`brother-${index}`}
                                type="number"
                                min="0"
                                value={role.slotsBrother}
                                onChange={(e) => updateRole(role.id, { slotsBrother: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            
                            <div className="md:col-span-1">
                              <Label htmlFor={`sister-${index}`}>Sisters</Label>
                              <Input
                                id={`sister-${index}`}
                                type="number"
                                min="0"
                                value={role.slotsSister}
                                onChange={(e) => updateRole(role.id, { slotsSister: parseInt(e.target.value) || 0 })}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label htmlFor={`poc-${index}`}>Point of Contact</Label>
                              <Select
                                value={role.suggestedPOC || "none"}
                                onValueChange={(value) => updateRole(role.id, { suggestedPOC: value === "none" ? null : value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select POC" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No POC</SelectItem>
                                  {contacts.map((contact) => (
                                    <SelectItem key={contact.id} value={contact.id}>
                                      {contact.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="md:col-span-1 flex items-end">
                              <Button
                                onClick={() => removeRole(role.id)}
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <Label htmlFor={`notes-${index}`}>Notes</Label>
                            <Textarea
                              id={`notes-${index}`}
                              value={role.notes}
                              onChange={(e) => updateRole(role.id, { notes: e.target.value })}
                              placeholder="Additional notes or requirements for this role"
                              rows={2}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {finalRoles.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-amber-800 mb-2">No volunteer roles yet</h3>
                      <p className="text-amber-600 mb-4">
                        {useAdvancedFeatures 
                          ? "Generate roles with AI or add custom roles to get started."
                          : "Go back to generate roles with AI or add custom roles manually."
                        }
                      </p>
                      <Button
                        onClick={addCustomRole}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Role
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Review & Publish Step */}
              {((currentStep === 4 && !useAdvancedFeatures) || (currentStep === 5 && useAdvancedFeatures)) && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-amber-800 mb-4">Review & Publish</h2>
                    <p className="text-amber-600 mb-6">Review your event details and volunteer requirements before publishing.</p>
                  </div>

                  {/* Event Summary */}
                  <Card className="border-amber-200">
                    <CardHeader>
                      <CardTitle className="text-amber-800">Event Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-amber-800">Basic Information</h4>
                          <div className="mt-2 space-y-1 text-sm text-amber-700">
                            <div><strong>Title:</strong> {eventData.title}</div>
                            <div><strong>Date:</strong> {eventData.date}</div>
                            <div><strong>Time:</strong> {eventData.startTime} - {eventData.endTime}</div>
                            <div><strong>Location:</strong> {eventData.location}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-amber-800">Settings</h4>
                          <div className="mt-2 space-y-1 text-sm text-amber-700">
                            <div><strong>SMS Reminders:</strong> {eventData.smsEnabled ? 'Enabled' : 'Disabled'}</div>
                            <div><strong>Day Before:</strong> {eventData.dayBeforeTime}</div>
                            <div><strong>Day Of:</strong> {eventData.dayOfTime}</div>
                            <div><strong>Total Roles:</strong> {finalRoles.length}</div>
                          </div>
                        </div>
                      </div>
                      {eventData.description && (
                        <div className="mt-4">
                          <h4 className="font-medium text-amber-800">Description</h4>
                          <p className="mt-1 text-sm text-amber-700">{eventData.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Volunteer Roles Summary */}
                  <Card className="border-amber-200">
                    <CardHeader>
                      <CardTitle className="text-amber-800">Volunteer Roles ({finalRoles.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {finalRoles.map((role) => (
                          <div key={role.id} className="flex justify-between items-center py-2 border-b border-amber-100 last:border-0">
                            <div>
                              <div className="font-medium text-amber-800">{role.roleLabel}</div>
                              <div className="text-sm text-amber-600">
                                {role.shiftStart} - {role.shiftEnd} • {role.slotsBrother}B / {role.slotsSister}S
                              </div>
                            </div>
                            <Badge variant="outline" className="border-amber-300 text-amber-700">
                              {role.slotsBrother + role.slotsSister} slots
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Advanced Features Summary */}
                  {useAdvancedFeatures && (
                    <>
                      {itinerary.length > 0 && (
                        <Card className="border-amber-200">
                          <CardHeader>
                            <CardTitle className="text-amber-800">Event Itinerary ({itinerary.length} items)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {itinerary.map((item) => (
                                <div key={item.id} className="flex items-center space-x-3 text-sm">
                                  <div className="font-medium text-amber-800 w-16">{item.time}</div>
                                  <div className="flex-1">
                                    <div className="font-medium text-amber-700">{item.title}</div>
                                    {item.description && (
                                      <div className="text-amber-600">{item.description}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {(additionalDetails.marketingLevel || additionalDetails.ageGroups.length > 0 || additionalDetails.tone) && (
                        <Card className="border-amber-200">
                          <CardHeader>
                            <CardTitle className="text-amber-800">Additional Details</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              {additionalDetails.marketingLevel && (
                                <div>
                                  <div className="font-medium text-amber-800">Marketing Level</div>
                                  <div className="text-amber-700 capitalize">{additionalDetails.marketingLevel}</div>
                                </div>
                              )}
                              {additionalDetails.tone && (
                                <div>
                                  <div className="font-medium text-amber-800">Tone</div>
                                  <div className="text-amber-700 capitalize">{additionalDetails.tone}</div>
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-amber-800">Expected Attendance</div>
                                <div className="text-amber-700">{additionalDetails.expectedAttendance} people</div>
                              </div>
                              {additionalDetails.ageGroups.length > 0 && (
                                <div>
                                  <div className="font-medium text-amber-800">Age Groups</div>
                                  <div className="text-amber-700">{additionalDetails.ageGroups.join(', ')}</div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}

                  {/* Publish Button */}
                  <div className="text-center pt-4">
                    <Button
                      onClick={publishEvent}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 text-lg"
                    >
                      <Calendar className="w-5 h-5 mr-3" />
                      {eventId ? "Update Event" : "Publish Event"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              onClick={prevStep}
              disabled={currentStep === 1}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              {((currentStep === 2 && !useAdvancedFeatures) || (currentStep === 3 && useAdvancedFeatures)) && (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={finalRoles.length === 0}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  Skip AI & Add Manually
                </Button>
              )}
              
              {currentStep < (useAdvancedFeatures ? 5 : 4) && (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventCreation;

</edits_to_apply>
