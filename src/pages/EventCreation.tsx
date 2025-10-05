import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { localDateTimeToUTC } from "@/utils/timezoneUtils";
import { Contact, SharedEventDetail } from "@/types/database";
import { useEventSharing } from "@/hooks/useEventSharing";

const EventCreation = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hideTestFeatures, setHideTestFeatures] = useState(true);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [newContactData, setNewContactData] = useState({ name: "", phone: "" });
  const [currentUser, setCurrentUser] = useState<any>(null);
  
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
  const [hasEditPermission, setHasEditPermission] = useState(true);
  
  const { checkEventAccess } = useEventSharing();

  const checkPermissions = async (eventId: string) => {
    // First check if user has any access to the event
    const { hasAccess: hasViewAccess, permissionLevel: viewPermission } = await checkEventAccess(eventId, 'view');
    
    if (!hasViewAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this event.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    // Then check if user has edit access
    const { hasAccess: hasEditAccess, permissionLevel: editPermission } = await checkEventAccess(eventId, 'edit');
    
    setHasEditPermission(hasEditAccess && editPermission === 'edit');
    
    // If user only has view access, show a message but don't redirect
    if (!hasEditAccess) {
      toast({
        title: "View Only Access",
        description: "You have view-only access to this event. You can view details but cannot make changes.",
        variant: "default",
      });
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      await loadContacts(user.id);

      // If editing, load event data from Supabase and check permissions
      if (eventId) {
        await checkPermissions(eventId);
        loadEventData(eventId);
      }
    };

    checkUser();
  }, [navigate, eventId]);

  const loadContacts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading contacts:', error);
        return;
      }

      setContacts(data?.map(contact => ({
        ...contact,
        source: contact.source as 'manual' | 'volunteer_signup'
      })) || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const addNewContact = async () => {
    if (!newContactData.name || !newContactData.phone) {
      toast({
        title: "Error",
        description: "Please fill in both name and phone number.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if a contact with this phone number already exists
      const { data: existingContact, error: checkError } = await supabase
        .from('contacts')
        .select('id, name, source')
        .eq('user_id', currentUser.id)
        .eq('phone', newContactData.phone)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is expected if no existing contact
        throw checkError;
      }

      if (existingContact) {
        // Contact already exists, show appropriate message
        if (existingContact.source === 'volunteer_signup') {
          toast({
            title: "Contact Already Exists",
            description: `A contact with phone number ${newContactData.phone} already exists from a volunteer signup.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Contact Already Exists",
            description: `A contact with phone number ${newContactData.phone} already exists.`,
            variant: "destructive",
          });
        }
        return;
      }

      // Create new contact
      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: currentUser.id,
          name: newContactData.name,
          phone: newContactData.phone,
          source: 'manual'
        });

      if (error) throw error;

      // Reload contacts
      await loadContacts(currentUser.id);
      
      toast({
        title: "Contact Added",
        description: `${newContactData.name} has been added to your contacts.`,
      });

      setNewContactData({ name: "", phone: "" });
      setIsContactDialogOpen(false);
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact.",
        variant: "destructive",
      });
    }
  };

  const generateItinerary = async () => {
    if (!eventData.title || !eventData.description || !eventData.startTime || !eventData.endTime) {
      return;
    }

    setIsLoading(true);
    
    // Simulate AI generation with a brief delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const eventDescription = eventData.description.toLowerCase();
    const startTime = eventData.startTime;
    const endTime = eventData.endTime;
    
    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationHours = endHour - startHour + (endMin - startMin) / 60;
    
    let generatedItinerary = [];
    
    // Setup time (1 hour before)
    const setupTime = addTimeMinutes(startTime, -60);
    generatedItinerary.push({
      id: crypto.randomUUID(),
      time: setupTime,
      title: "Setup & Preparation",
      description: "Arrange venue, setup equipment, and prepare materials"
    });

    // Check if it's a food event
    const hasFood = eventDescription.includes('food') || eventDescription.includes('meal') || 
                   eventDescription.includes('dinner') || eventDescription.includes('lunch') || 
                   eventDescription.includes('iftar') || eventDescription.includes('breakfast');

    // Registration/Welcome
    generatedItinerary.push({
      id: crypto.randomUUID(),
      time: addTimeMinutes(startTime, -15),
      title: "Registration & Welcome",
      description: "Guest check-in and welcome"
    });

    // Event start
    generatedItinerary.push({
      id: crypto.randomUUID(),
      time: startTime,
      title: eventData.title + " Begins",
      description: "Main event activities commence"
    });

    // If it's a long event (>2 hours), add mid-event activities
    if (durationHours > 2) {
      const midTime = addTimeMinutes(startTime, Math.floor(durationHours * 30));
      
      if (hasFood) {
        generatedItinerary.push({
          id: crypto.randomUUID(),
          time: midTime,
          title: "Meal Service",
          description: "Serve refreshments or meals to attendees"
        });
      } else {
        generatedItinerary.push({
          id: crypto.randomUUID(),
          time: midTime,
          title: "Break & Networking",
          description: "Short break for attendees to network and refresh"
        });
      }
    }

    // Event conclusion
    generatedItinerary.push({
      id: crypto.randomUUID(),
      time: addTimeMinutes(endTime, -15),
      title: "Closing Remarks",
      description: "Final announcements and thank you"
    });

    // Cleanup
    generatedItinerary.push({
      id: crypto.randomUUID(),
      time: addTimeMinutes(endTime, 15),
      title: "Cleanup & Breakdown",
      description: "Clean venue and pack up equipment"
    });

    setItinerary(generatedItinerary);
    setIsLoading(false);
    
    toast({
      title: "Itinerary Generated!",
      description: "AI has created a custom itinerary based on your event details.",
    });
  };

  const loadEventData = async (id: string) => {
    try {
      // First try to load via RPC for shared events
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_shared_event_detail', { p_event_id: id });

      if (rpcData && rpcData.length > 0) {
        // This is a shared event, use RPC data
        const eventData = rpcData[0] as SharedEventDetail;
        const event = eventData.event;
        const volunteerRoles = eventData.volunteer_roles || [];

        setEventData({
          title: event.title,
          date: event.start_datetime.split('T')[0],
          startTime: event.start_datetime.split('T')[1].slice(0, 5),
          endTime: event.end_datetime.split('T')[1].slice(0, 5),
          location: event.location,
          description: event.description || "",
          smsEnabled: event.sms_enabled || true,
          dayBeforeTime: event.day_before_time || "09:00",
          dayOfTime: event.day_of_time || "15:00",
          status: event.status as "draft" | "published"
        });

        // Convert volunteer_roles to finalRoles format
        const roles = volunteerRoles.map((role: any) => ({
          id: role.id,
          roleLabel: role.role_label,
          shiftStart: role.shift_start,
          shiftEnd: role.shift_end,
          slotsBrother: role.slots_brother || 0,
          slotsSister: role.slots_sister || 0,
          suggestedPOC: role.suggested_poc,
          notes: role.notes || "",
          status: "accepted"
        }));

        setFinalRoles(roles);
        setCurrentStep(1); // Always start at step 1 when editing
        return;
      }

      // If RPC didn't work, try direct table query (for owned events)
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
        setCurrentStep(1); // Always start at step 1 when editing
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

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to get the actual step number based on hideTestFeatures
  const getStepNumber = (logicalStep: number) => {
    if (!hideTestFeatures) return logicalStep;
    
    // When hiding test features: 1 -> 1, 2 -> 2, 3 -> skip, 4 -> skip, 5 -> 3, 6 -> 4
    if (logicalStep <= 2) return logicalStep;
    if (logicalStep >= 5) return logicalStep - 2;
    return logicalStep; // This shouldn't happen when features are hidden
  };

  // Helper function to get the logical step from display step
  const getLogicalStep = (displayStep: number) => {
    if (!hideTestFeatures) return displayStep;
    
    // When hiding test features: 1 -> 1, 2 -> 2, 3 -> 5, 4 -> 6
    if (displayStep <= 2) return displayStep;
    if (displayStep === 3) return 5;
    if (displayStep === 4) return 6;
    return displayStep;
  };

  const getVisibleSteps = () => {
    const allSteps = [
      { number: 1, title: "Basic Info", description: "Event details" },
      { number: 2, title: "Event Itinerary", description: "Timeline & schedule" },
      { number: 3, title: "Enhanced Details", description: "Preferences & details" },
      { number: 4, title: "Pre-Event Tasks", description: "Planning & assignments" },
      { number: 5, title: "Volunteer Slots", description: "AI suggestions & roles" },
      { number: 6, title: "Review & Publish", description: "Final settings" }
    ];

    if (hideTestFeatures) {
      return allSteps.filter(step => step.number !== 3 && step.number !== 4).map((step, index) => ({
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
      // Generate additional roles based on itinerary (but NO coordinators)
      const itineraryRoles = itinerary
        .filter(item => 
          !item.title.toLowerCase().includes('setup') && 
          !item.title.toLowerCase().includes('cleanup') &&
          !item.title.toLowerCase().includes('coordinator') &&
          !item.title.toLowerCase().includes('begins') &&
          !item.title.toLowerCase().includes('remarks')
        )
        .map(item => ({
          id: crypto.randomUUID(),
          roleLabel: `${item.title} Support`,
          shiftStart: item.time,
          shiftEnd: addTimeMinutes(item.time, 60),
          slotsBrother: 1,
          slotsSister: 1,
          suggestedPOC: null,
          notes: item.description || `Support activities for ${item.title.toLowerCase()}`
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

  const saveEvent = async (status: 'draft' | 'published') => {
    try {
      // Check permissions if editing an existing event
      if (eventId && !hasEditPermission) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to edit this event.",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create events.",
          variant: "destructive",
        });
        return;
      }

      console.log(`Saving event as ${status} with final roles:`, finalRoles);

      // Create or update the event
      // FIXED: Timezone issue resolved by converting local time to UTC before saving
      // This ensures that when an organizer sets 6:00 PM, it displays as 6:00 PM for volunteers
      // instead of appearing 4 hours behind due to timezone conversion issues
      const eventPayload = {
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start_datetime: localDateTimeToUTC(eventData.date, eventData.startTime),
        end_datetime: localDateTimeToUTC(eventData.date, eventData.endTime),
        sms_enabled: eventData.smsEnabled,
        day_before_time: eventData.dayBeforeTime,
        day_of_time: eventData.dayOfTime,
        status: status,
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

        // Preserve existing volunteer_roles to avoid breaking volunteer associations
        // We no longer delete roles on event update.
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

      // Upsert volunteer roles (preserve IDs to keep volunteer signups linked)
      if (finalRoles.length > 0) {
        const rolesPayload = finalRoles
          .filter(role => role.roleLabel && role.roleLabel.trim() !== '')
          .map(role => ({
            id: role.id, // preserve id so existing volunteers remain linked
            event_id: savedEventId,
            role_label: role.roleLabel,
            shift_start: role.shiftStart, // This is already a TIME string (HH:MM)
            shift_end: role.shiftEnd,     // This is already a TIME string (HH:MM)
            slots_brother: role.slotsBrother || 0,
            slots_sister: role.slotsSister || 0,
            suggested_poc: null,
            notes: role.notes || ""
          }));

        console.log('Upserting roles payload:', rolesPayload);

        if (rolesPayload.length > 0) {
          const { error: rolesError } = await supabase
            .from('volunteer_roles')
            .upsert(rolesPayload, { onConflict: 'id' });

          if (rolesError) {
            console.error('Error saving roles:', rolesError);
            toast({
              title: "Error",
              description: "Failed to save volunteer roles.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      if (status === 'published') {
        toast({
          title: "Event Published!",
          description: `${eventData.title} is now live and accepting volunteer sign-ups.`,
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Event Saved as Draft!",
          description: `${eventData.title} has been saved as a draft. You can continue editing or publish it later.`,
        });
        // Stay on the same page for drafts
      }
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
    
    // Generate itinerary when moving from step 1 to step 2
    if (currentStep === 1 && itinerary.length === 0) {
      generateItinerary();
    }
    
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
        return true; // Itinerary is optional but encouraged
      case 3:
        return true; // Enhanced details are optional
      case 4:
        return true; // Pre-event tasks are optional
      case 5:
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-umma-900">
                {eventId ? "Edit Event" : "Create New Event"}
              </h1>
              {eventId && eventData.status === 'draft' && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-sm">
                  Draft
                </Badge>
              )}
              {eventId && eventData.status === 'published' && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-sm">
                  Published
                </Badge>
              )}
            </div>
            
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
          
          {/* Draft Event Info */}
          {eventId && eventData.status === 'draft' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-yellow-600 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Draft Event</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    This event is saved as a draft. You can continue editing and save your progress. 
                    When you're ready, publish the event to make it live and start accepting volunteer sign-ups.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Save Progress Info */}
          {!eventId && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-600 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Save Your Progress</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You can save your progress as a draft at any step using the "Save as Draft" button. 
                    This allows you to work on your event incrementally and publish when you're ready.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Step Indicator */}
          <div className="flex flex-wrap items-center gap-4 mb-6 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-shrink-0">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    currentStep >= step.number 
                      ? "bg-umma-600 text-white hover:bg-umma-700 hover:shadow-md cursor-pointer" 
                      : canProceed() && step.number <= currentStep + 1
                        ? "bg-umma-300 text-white hover:bg-umma-500 hover:shadow-md cursor-pointer"
                        : "bg-gray-200 text-gray-600"
                  }`}
                  onClick={() => {
                    // Allow navigation to completed steps, current step, or next step if current step is valid
                    if (currentStep >= step.number) {
                      setCurrentStep(step.number);
                    } else if (canProceed() && step.number <= currentStep + 1) {
                      // Generate itinerary when moving from step 1 to step 2
                      if (currentStep === 1 && step.number === 2 && itinerary.length === 0) {
                        generateItinerary();
                      }
                      setCurrentStep(step.number);
                    }
                  }}
                  title={
                    currentStep >= step.number 
                      ? `Go to ${step.title}` 
                      : canProceed() && step.number <= currentStep + 1
                        ? `Continue to ${step.title}`
                        : "Complete current step first"
                  }
                >
                  {step.number}
                </div>
                <div 
                  className={`ml-2 hidden sm:block transition-all duration-200 ${
                    currentStep >= step.number 
                      ? "cursor-pointer hover:opacity-80 hover:scale-105 hover:border-b hover:border-umma-300" 
                      : canProceed() && step.number <= currentStep + 1
                        ? "cursor-pointer hover:opacity-80 hover:scale-105 hover:border-b hover:border-umma-300"
                        : "cursor-default"
                  }`}
                  onClick={() => {
                    // Allow navigation to completed steps, current step, or next step if current step is valid
                    if (currentStep >= step.number) {
                      setCurrentStep(step.number);
                    } else if (canProceed() && step.number <= currentStep + 1) {
                      // Generate itinerary when moving from step 1 to step 2
                      if (currentStep === 1 && step.number === 2 && itinerary.length === 0) {
                        generateItinerary();
                      }
                      setCurrentStep(step.number);
                    }
                  }}
                  title={
                    currentStep >= step.number 
                      ? `Go to ${step.title}` 
                      : canProceed() && step.number <= currentStep + 1
                        ? `Continue to ${step.title}`
                        : "Complete current step first"
                  }
                >
                  <div className={`text-sm font-medium flex items-center gap-1 ${
                    currentStep >= step.number 
                      ? "text-umma-800" 
                      : canProceed() && step.number <= currentStep + 1
                        ? "text-umma-600"
                        : "text-gray-400"
                  }`}>
                    {step.title}
                    {(currentStep >= step.number || (canProceed() && step.number <= currentStep + 1)) && (
                      <ChevronRight className="w-3 h-3 text-umma-600 opacity-60" />
                    )}
                  </div>
                  <div className={`text-xs ${
                    currentStep >= step.number 
                      ? "text-umma-500" 
                      : canProceed() && step.number <= currentStep + 1
                        ? "text-umma-400"
                        : "text-gray-300"
                  }`}>
                    {step.description}
                  </div>
                </div>
                
                {/* Mobile step indicator - always clickable */}
                <div 
                  className={`ml-2 sm:hidden transition-all duration-200 ${
                    currentStep >= step.number 
                      ? "cursor-pointer active:scale-95" 
                      : canProceed() && step.number <= currentStep + 1
                        ? "cursor-pointer active:scale-95"
                        : "cursor-default"
                  }`}
                  onClick={() => {
                    // Allow navigation to completed steps, current step, or next step if current step is valid
                    if (currentStep >= step.number) {
                      setCurrentStep(step.number);
                    } else if (canProceed() && step.number <= currentStep + 1) {
                      // Generate itinerary when moving from step 1 to step 2
                      if (currentStep === 1 && step.number === 2 && itinerary.length === 0) {
                        generateItinerary();
                      }
                      setCurrentStep(step.number);
                    }
                  }}
                  title={
                    currentStep >= step.number 
                      ? `Go to ${step.title}` 
                      : canProceed() && step.number <= currentStep + 1
                        ? `Continue to ${step.title}`
                        : "Complete current step first"
                  }
                >
                  <div className={`text-sm font-medium flex items-center gap-1 ${
                    currentStep >= step.number 
                      ? "text-umma-800" 
                      : canProceed() && step.number <= currentStep + 1
                        ? "text-umma-600"
                        : "text-gray-400"
                  }`}>
                    {step.title}
                    {(currentStep >= step.number || (canProceed() && step.number <= currentStep + 1)) && (
                      <ChevronRight className="w-3 h-3 text-umma-600 opacity-60" />
                    )}
                  </div>
                  <div className={`text-xs ${
                    currentStep >= step.number 
                      ? "text-umma-500" 
                      : canProceed() && step.number <= currentStep + 1
                        ? "text-umma-400"
                        : "text-gray-300"
                  }`}>
                    {step.description}
                  </div>
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
                {eventId && !hasEditPermission && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <p className="text-blue-800 font-medium">View Only Mode</p>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      You have view-only access to this event. You can see all details but cannot make changes.
                    </p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-umma-800">Event Information</h2>
                    {eventId && eventData.status === 'draft' && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Draft
                      </Badge>
                    )}
                    {eventId && eventData.status === 'published' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                        Published
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!eventId && (
                      <Button 
                        variant="outline" 
                        onClick={() => saveEvent('draft')}
                        className="text-sm border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                        disabled={!canProceed()}
                      >
                        Save as Draft
                      </Button>
                    )}
                    {eventId && hasEditPermission && (
                      <Button 
                        variant="outline" 
                        onClick={() => saveEvent('draft')}
                        className="text-sm border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                        disabled={!canProceed()}
                      >
                        {eventData.status === 'draft' ? 'Save Draft' : 'Save as Draft'}
                      </Button>
                    )}
                  </div>
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
                      disabled={eventId && !hasEditPermission}
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
                      disabled={eventId && !hasEditPermission}
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
                      disabled={eventId && !hasEditPermission}
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
                      disabled={eventId && !hasEditPermission}
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
                      disabled={eventId && !hasEditPermission}
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
                      disabled={eventId && !hasEditPermission}
                    />
                  </div>
                </div>
                
                {/* Save Progress Button for Step 1 */}
                {!eventId && (
                  <div className="pt-4 border-t border-umma-100">
                    <Button 
                      variant="outline" 
                      onClick={() => saveEvent('draft')}
                      className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                      disabled={!canProceed()}
                    >
                      Save Progress as Draft
                    </Button>
                    <p className="text-xs text-umma-500 text-center mt-2">
                      Save your current progress and continue later
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Itinerary - Now always visible as dedicated step */}
            {logicalCurrentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-umma-800">Event Itinerary</h2>
                <p className="text-gray-600 mb-6">
                  Create a detailed timeline for your event. This helps AI generate more precise volunteer roles and timing in the next steps.
                </p>
                
                <ItineraryEditor
                  itinerary={itinerary}
                  onItineraryChange={setItinerary}
                  startTime={eventData.startTime}
                  endTime={eventData.endTime}
                  isGenerated={itinerary.length > 0}
                  disabled={eventId && !hasEditPermission}
                />
                
                {itinerary.length === 0 && (
                  <div className="text-center py-6">
                    <Button 
                      onClick={generateItinerary}
                      className="bg-gradient-to-r from-umma-500 to-umma-700 hover:from-umma-600 hover:to-umma-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={!eventData.description || isLoading || (eventId && !hasEditPermission)}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Itinerary
                        </>
                      )}
                    </Button>
                    {!eventData.description && (
                      <p className="text-sm text-umma-500 mt-2">Add an event description first to generate AI itinerary</p>
                    )}
                  </div>
                )}
                
                {/* Save Progress Button for Step 2 */}
                {!eventId && (
                  <div className="pt-6 border-t border-umma-100">
                    <Button 
                      variant="outline" 
                      onClick={() => saveEvent('draft')}
                      className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                      disabled={!canProceed()}
                    >
                      Save Progress as Draft
                    </Button>
                    <p className="text-xs text-umma-500 text-center mt-2">
                      Save your current progress and continue later
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Enhanced Details - Only show when hideTestFeatures is false */}
            {logicalCurrentStep === 3 && !hideTestFeatures && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-umma-800">Enhanced Event Details</h2>
                <p className="text-gray-600 mb-6">
                  Add additional preferences to help AI generate more precise volunteer roles and pre-event tasks.
                </p>
                
                <AdditionalDetailsWizard
                  details={additionalDetails}
                  onDetailsChange={setAdditionalDetails}
                  isExpanded={true}
                  onToggleExpand={() => {}}
                  disabled={eventId && !hasEditPermission}
                />
                
                {/* Save Progress Button for Step 3 */}
                {!eventId && (
                  <div className="pt-6 border-t border-umma-100">
                    <Button 
                      variant="outline" 
                      onClick={() => saveEvent('draft')}
                      className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                      disabled={!canProceed()}
                    >
                      Save Progress as Draft
                    </Button>
                    <p className="text-xs text-umma-500 text-center mt-2">
                      Save your current progress and continue later
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Pre-Event Tasks - Only show when hideTestFeatures is false */}
            {logicalCurrentStep === 4 && !hideTestFeatures && (
              <div className="space-y-6">
                <PreEventTasksManager
                  tasks={preEventTasks}
                  onTasksChange={setPreEventTasks}
                  contacts={contacts}
                  eventDate={eventData.date}
                  eventDescription={eventData.description}
                  disabled={eventId && !hasEditPermission}
                />
                
                {/* Save Progress Button for Step 4 */}
                {!eventId && (
                  <div className="pt-6 border-t border-umma-100">
                    <Button 
                      variant="outline" 
                      onClick={() => saveEvent('draft')}
                      className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                      disabled={!canProceed()}
                    >
                      Save Progress as Draft
                    </Button>
                    <p className="text-xs text-umma-500 text-center mt-2">
                      Save your current progress and continue later
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Volunteer Slots */}
            {logicalCurrentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-umma-800">Volunteer Role Generation</h2>
                  <p className="text-umma-600 mb-6">
                    AI will analyze your event details to generate tailored volunteer roles.
                  </p>
                  
                  {itinerary.length > 0 && (
                    <Card className="mb-4 border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-green-800 mb-2">Generated Itinerary Preview:</h4>
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
                      <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                      <Button 
                        onClick={parseWithAI}
                        className="w-full sm:w-auto"
                        disabled={!eventData.description || (eventId && !hasEditPermission)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Role Suggestions
                      </Button>
                      {!eventData.description && (
                        <p className="text-sm text-muted-foreground mt-2">Add an event description first</p>
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
                                    <span>{formatTimeDisplay(suggestion.shiftStart)} - {formatTimeDisplay(suggestion.shiftEnd)}</span>
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
                                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                                  disabled={eventId && !hasEditPermission}
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
                                    disabled={eventId && !hasEditPermission}
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
                                      disabled={eventId && !hasEditPermission}
                                    />
                                    <Input
                                      type="time"
                                      value={role.shiftEnd}
                                      onChange={(e) => updateRole(role.id, { shiftEnd: e.target.value })}
                                      className="border-umma-200 focus-visible:ring-umma-500"
                                      disabled={eventId && !hasEditPermission}
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
                                        disabled={eventId && !hasEditPermission}
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
                                        disabled={eventId && !hasEditPermission}
                                      />
                                      <div className="text-xs text-umma-500 mt-1">Sisters</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-umma-700">Point of Contact</Label>
                                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                                    <div className="flex-1">
                                      <div className="flex gap-2">
                                        <Select 
                                          value={role.suggestedPOC || ""} 
                                          onValueChange={(value) => updateRole(role.id, { suggestedPOC: value })}
                                          disabled={eventId && !hasEditPermission}
                                        >
                                          <SelectTrigger className="border-umma-200">
                                            <SelectValue placeholder="Select POC" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {contacts.map((contact: Contact) => (
                                              <SelectItem key={contact.id} value={contact.id}>
                                                {contact.name} - {contact.phone}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                                          <DialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-umma-300 text-umma-700 hover:bg-umma-100"
                                              disabled={eventId && !hasEditPermission}
                                            >
                                              <Plus className="w-4 h-4" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-md">
                                            <DialogHeader>
                                              <DialogTitle>Add New Contact</DialogTitle>
                                              <DialogDescription>
                                                Add a new contact to use as Point of Contact for roles.
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                              <div className="space-y-2">
                                                <Label htmlFor="newContactName">Name</Label>
                                                <Input
                                                  id="newContactName"
                                                  value={newContactData.name}
                                                  onChange={(e) => setNewContactData(prev => ({ ...prev, name: e.target.value }))}
                                                  placeholder="Contact name"
                                                  disabled={eventId && !hasEditPermission}
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="newContactPhone">Phone</Label>
                                                <Input
                                                  id="newContactPhone"
                                                  value={newContactData.phone}
                                                  onChange={(e) => setNewContactData(prev => ({ ...prev, phone: e.target.value }))}
                                                  placeholder="+1 (555) 123-4567"
                                                  disabled={eventId && !hasEditPermission}
                                                />
                                              </div>
                                              <div className="flex gap-2 pt-4">
                                                <Button
                                                  variant="outline"
                                                  onClick={() => setIsContactDialogOpen(false)}
                                                  className="flex-1"
                                                  disabled={eventId && !hasEditPermission}
                                                >
                                                  Cancel
                                                </Button>
                                                <Button
                                                  onClick={addNewContact}
                                                  className="flex-1 bg-gradient-to-r from-umma-500 to-umma-600 hover:from-umma-600 hover:to-umma-700"
                                                  disabled={eventId && !hasEditPermission}
                                                >
                                                  Add Contact
                                                </Button>
                                              </div>
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => removeRole(role.id)}
                                      className="border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                                      disabled={eventId && !hasEditPermission}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              
                                <div className="space-y-2">
                                  <Label className="text-umma-700">Notes (Optional)</Label>
                                  <Input
                                    value={role.notes}
                                    onChange={(e) => updateRole(role.id, { notes: e.target.value })}
                                    placeholder="Special instructions or requirements"
                                    className="border-umma-200 focus-visible:ring-umma-500"
                                    disabled={eventId && !hasEditPermission}
                                  />
                                </div>
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
                    className="w-full mt-4"
                    disabled={eventId && !hasEditPermission}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Role
                  </Button>
                  
                  {/* Save Progress Button for Step 5 */}
                  {!eventId && (
                    <div className="pt-6 border-t border-umma-100">
                      <Button 
                        variant="outline" 
                        onClick={() => saveEvent('draft')}
                        className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                        disabled={!canProceed()}
                      >
                        Save Progress as Draft
                      </Button>
                      <p className="text-xs text-umma-500 text-center mt-2">
                        Save your current progress and continue later
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Review & Publish */}
            {logicalCurrentStep === 6 && (
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
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        📅 Coming Soon: SMS reminders will be available in an upcoming update
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 opacity-50">
                      <div>
                        <Label className="text-umma-700">Enable SMS Reminders</Label>
                        <p className="text-sm text-umma-500">Send automatic reminders to volunteers</p>
                      </div>
                      <Switch
                        checked={eventData.smsEnabled}
                        onCheckedChange={(checked) => setEventData(prev => ({ ...prev, smsEnabled: checked }))}
                        disabled={true}
                      />
                    </div>
                    
                    {eventData.smsEnabled && (
                      <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-umma-100 opacity-50">
                        <div className="space-y-2">
                          <Label className="text-umma-700">Day Before Reminder</Label>
                          <Input
                            type="time"
                            value={eventData.dayBeforeTime}
                            onChange={(e) => setEventData(prev => ({ ...prev, dayBeforeTime: e.target.value }))}
                            className="border-umma-200 focus-visible:ring-umma-500"
                            disabled={true}
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
                            disabled={true}
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 1}
              className="w-full sm:w-auto border-umma-300 text-umma-700 hover:bg-umma-100"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {/* Persistent Save as Draft Button */}
            {hasEditPermission && (
              <Button 
                onClick={() => saveEvent('draft')}
                variant="outline"
                className="bg-white border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                disabled={!canProceed()}
              >
                {eventId && eventData.status === 'draft' ? 'Save Draft' : 'Save as Draft'}
              </Button>
            )}
          </div>
          
          <div className="flex w-full sm:w-auto gap-2">
            {currentStep === steps.length ? (
              <Button 
                onClick={() => saveEvent('published')}
                className="w-full"
                disabled={!canProceed() || (eventId && !hasEditPermission)}
              >
                {eventId ? (hasEditPermission ? "Update & Publish" : "View Only - No Edit Access") : "Publish Event"}
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                disabled={!canProceed() || (eventId && !hasEditPermission)}
                className="w-full"
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
