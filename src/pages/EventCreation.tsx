import { useState, useEffect, useMemo, useCallback } from "react";
import { localDateTimeToUTC, formatTime24To12 } from "../utils/timezoneUtils";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ItineraryEditor from "@/components/event-creation/ItineraryEditor";
import AITextToEventInput from "@/components/event-creation/AITextToEventInput";
import type { ParsedEventData } from "@/utils/openaiClient";
import AdditionalDetailsWizard, { AdditionalDetails } from "@/components/event-creation/AdditionalDetailsWizard";
import PreEventTasksManager from "@/components/event-creation/PreEventTasksManager";
import TemplateSelector from "@/components/event-creation/TemplateSelector";
import SaveAsTemplateDialog from "@/components/event-creation/SaveAsTemplateDialog";
import Navigation from "@/components/Navigation";
import { useEventDeletion } from "@/hooks/useEventDeletion";
import { LocationInput } from "@/components/ui/location-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { StickyBottomBar } from "@/components/ui/sticky-bottom-bar";
import { SectionCard } from "@/components/ui/section-card";
import { StepProgressBar } from "@/components/ui/step-progress-bar";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  TestTube,
  Eye,
  EyeOff,
  Plus,
  FileText,
  AlertTriangle,
  Users
} from "lucide-react";
import { Contact } from "@/types/database";



interface VolunteerRole {
  id: string;
  roleLabel: string;
  slotsBrother: number;
  slotsSister: number;
  slotsFlexible: number;
  shiftStartTime: string;
  shiftEndTime: string;
  notes?: string;
  suggestedPOC?: string[];
}

interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  volunteerRoles: VolunteerRole[];
}

const EventCreation = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();

  // Core state
  const [currentStep, setCurrentStep] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hideTestFeatures, setHideTestFeatures] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newContactData, setNewContactData] = useState({ firstName: "", lastName: "", phone: "", gender: "" as 'brother' | 'sister' | '' });
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasEditPermission, setHasEditPermission] = useState(true);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isLoadingEventData, setIsLoadingEventData] = useState(false);
  const [hasLoadedEventData, setHasLoadedEventData] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Auto-save and draft management
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastSavedData, setLastSavedData] = useState<string>(''); // JSON string of last saved state
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Event data
  const [eventData, setEventData] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    status: "draft" as "draft" | "published",
    isPublic: true,
    smsEnabled: false,
    dayBeforeTime: "19:00",
    dayOfTime: "15:00"
  });

  // Safe ID generator
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Helper function to detect overnight events
  const isOvernightEvent = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    return startTime >= endTime;
  };

  // Helper function to get the next day for overnight events
  // Helper function to get the next day for overnight events
  const getNextDay = (dateString: string): string => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const normalizeTime = (time: string | null | undefined) => {
    if (!time) return "00:00";
    // specific fix for "HH:MM:SS" -> "HH:MM"
    if (time.length === 8) return time.substring(0, 5);
    return time;
  };

  // Enhanced features state  
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState<AdditionalDetails>({});
  const [preEventTasks, setPreEventTasks] = useState([]);

  // Validation state
  const [showValidation, setShowValidation] = useState(false);

  // Wrapper function to reset validation when itinerary changes
  const handleItineraryChange = (newItinerary: ItineraryItem[]) => {
    setItinerary(newItinerary);
    setShowValidation(false);
  };

  // Function to validate itinerary before proceeding
  const validateItinerary = () => {
    let hasErrors = false;

    for (const item of itinerary) {
      for (const role of item.volunteerRoles) {
        if (role.shiftStartTime && role.shiftEndTime) {
          const startMinutes = parseInt(role.shiftStartTime.split(':')[0]) * 60 + parseInt(role.shiftStartTime.split(':')[1]);
          const endMinutes = parseInt(role.shiftEndTime.split(':')[0]) * 60 + parseInt(role.shiftEndTime.split(':')[1]);

          if (endMinutes <= startMinutes) {
            hasErrors = true;
            break;
          }
        }
      }
      if (hasErrors) break;
    }

    if (hasErrors) {
      toast({
        title: "Validation Error",
        description: "Please fix the time validation errors before proceeding.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }

  // Hooks
  const { softDeleteEvent, isDeleting } = useEventDeletion();












  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard event listeners for Shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper functions
  const addTimeMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Normalize a phone number to E.164 (+15551234567)
  // - Removes spaces, dashes, parentheses
  // - Adds +1 for 10-digit US numbers
  const normalizePhoneE164 = (input: string) => {
    const digits = (input || "").replace(/[^\d+]/g, "");
    if (digits.startsWith('+')) return digits;
    if (/^1\d{10}$/.test(digits)) return `+${digits}`;
    if (/^\d{10}$/.test(digits)) return `+1${digits}`;
    return digits ? `+${digits}` : '';
  };

  // Use native time inputs to allow manual editing

  // Helpers to handle dates in local time (avoid UTC shift issues)
  const formatYMDLocal = (d: Date): string => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const dateFromYMDLocal = (ymd: string): Date => {
    // Force midday local time to avoid DST/UTC boundary issues
    return new Date(`${ymd}T12:00:00`);
  };

  // Step management
  const getLogicalStep = (displayStep: number) => {
    if (!hideTestFeatures) return displayStep;

    // When hiding test features: 1 -> 1, 2 -> 2, 3 -> 5
    if (displayStep <= 2) return displayStep;
    if (displayStep === 3) return 5;
    return displayStep;
  };

  const getVisibleSteps = () => {
    const allSteps = [
      { number: 1, title: "Basic Info", description: "Event details" },
      { number: 2, title: "Event Planning", description: "Timeline & volunteer roles" },
      { number: 3, title: "Enhanced Details", description: "Preferences & details" },
      { number: 4, title: "Pre-Event Tasks", description: "Planning & assignments" },
      { number: 5, title: "Review & Publish", description: "Final settings" }
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
  const logicalCurrentStep = getLogicalStep(currentStep);

  // Validation
  const canProceed = () => {
    if (logicalCurrentStep === 1) {
      return eventData.title && eventData.date && eventData.startTime && eventData.endTime && eventData.location;
    }
    return true;
  };

  // Navigation with unsaved changes protection
  const nextStep = () => {
    if (currentStep < steps.length) {
      // Validate basic info when moving from step 1 to step 2
      if (logicalCurrentStep === 1) {
        // Validate time logic - allow overnight events
        if (eventData.startTime && eventData.endTime && eventData.startTime >= eventData.endTime) {
          // Check if this is an overnight event (valid for multi-day events like Ramadan)
          const isOvernight = isOvernightEvent(eventData.startTime, eventData.endTime);
          if (isOvernight) {
            // Allow overnight events - they will span to the next day
            console.log("Overnight event detected - allowing multi-day event");
          } else {
            toast({
              title: "Invalid time",
              description: "End time must be after start time.",
              variant: "destructive",
            });
            return; // Don't proceed if validation fails
          }
        }
      }

      // Validate itinerary when moving from step 2 (itinerary) to step 3
      if (logicalCurrentStep === 2) {
        setShowValidation(true);

        // Check if there are validation errors
        if (!validateItinerary()) {
          return; // Don't proceed if validation fails
        }
      }

      if (hasUnsavedChanges) {
        setPendingNavigation(`step-${currentStep + 1}`);
        setShowUnsavedChangesDialog(true);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Reset validation when going back to step 2
      if (logicalCurrentStep === 3) {
        setShowValidation(false);
      }

      if (hasUnsavedChanges) {
        setPendingNavigation(`step-${currentStep - 1}`);
        setShowUnsavedChangesDialog(true);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const goToStep = (targetStep: number) => {
    // Allow navigation to any step, but validate required fields for step 1
    if (targetStep === 1 || canProceed()) {
      if (hasUnsavedChanges) {
        setPendingNavigation(`step-${targetStep}`);
        setShowUnsavedChangesDialog(true);
      } else {
        setCurrentStep(targetStep);
      }
    } else {
      toast({
        title: "Cannot proceed",
        description: "Please complete the required fields before navigating to other steps.",
        variant: "destructive",
      });
    }
  };

  // Data loading and saving
  const loadContacts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
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

  // Helper function to capitalize names
  const capitalizeName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Optimized change handlers to reduce re-renders
  const handleFirstNameChange = useCallback((value: string) => {
    setNewContactData(prev => ({ ...prev, firstName: value }));
  }, []);

  const handleLastNameChange = useCallback((value: string) => {
    setNewContactData(prev => ({ ...prev, lastName: value }));
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setNewContactData(prev => ({ ...prev, phone: value }));
  }, []);

  const handleGenderChange = useCallback((value: 'brother' | 'sister' | '') => {
    setNewContactData(prev => ({ ...prev, gender: value }));
  }, []);

  const addNewContact = async () => {
    if (!newContactData.firstName || !newContactData.lastName || !newContactData.phone || !newContactData.gender) {
      toast({
        title: "Error",
        description: "Please fill in first name, last name, phone number, and select a gender.",
        variant: "destructive",
      });
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to add a contact.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingContact(true);

    try {
      const normalizedPhone = normalizePhoneE164(newContactData.phone);

      // 1. Check if contact exists in the DATABASE (source of truth)
      const { data: existingDbContact, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingDbContact) {
        // SCENARIO 1: Contact exists
        if (existingDbContact.role === 'volunteer') {
          // Upgrade to POC
          const { data: upgradedContact, error: updateError } = await supabase
            .from('contacts')
            .update({ role: 'poc' })
            .eq('id', existingDbContact.id)
            .select()
            .maybeSingle(); // Use maybeSingle to avoid PGRST116 if RLS blocks update

          if (updateError) throw updateError;

          if (!upgradedContact) {
            // RLS prevented update or row deleted
            toast({
              title: "Update Failed",
              description: "Found the contact but could not upgrade them. You may not have permission.",
              variant: "destructive",
            });
            return;
          }

          if (upgradedContact) {
            // Update local state if the contact was already loaded, or add it
            setContacts(prev => {
              const existsLocally = prev.some(c => c.id === upgradedContact.id);
              if (existsLocally) {
                return prev.map(c => c.id === upgradedContact.id ? (upgradedContact as unknown as Contact) : c);
              }
              return [...prev, (upgradedContact as unknown as Contact)];
            });

            toast({
              title: "Contact Upgraded",
              description: `${upgradedContact.name} has been upgraded from Volunteer to Point of Contact.`,
            });
            // Close dialog
            setNewContactData({ firstName: "", lastName: "", phone: "", gender: "" });
            setShowAddContact(false);
            return;
          }
        } else if (existingDbContact.role === 'poc' || existingDbContact.role === 'admin') {
          // Already a POC/Admin
          toast({
            title: "Contact Already Exists",
            description: `${existingDbContact.name} is already a Point of Contact.`,
            variant: "default", // Informational, not destructive
          });
          // Ensure they are in local list so user can select them
          setContacts(prev => {
            const existsLocally = prev.some(c => c.id === existingDbContact.id);
            return existsLocally ? prev : [...prev, (existingDbContact as unknown as Contact)];
          });
          setNewContactData({ firstName: "", lastName: "", phone: "", gender: "" });
          setShowAddContact(false);
          return;
        } else {
          // Other roles? Just warn
          toast({
            title: "Contact Exists",
            description: `This number belongs to ${existingDbContact.name} (${existingDbContact.role}).`,
            variant: "destructive",
          });
          return;
        }
      }

      // SCENARIO 2: Contact does not exist -> Create new
      const newContact = {
        name: capitalizeName(`${newContactData.firstName} ${newContactData.lastName}`),
        phone: normalizedPhone,
        gender: newContactData.gender,
        user_id: currentUser.id,
        source: 'manual' as const,
        role: 'poc' as const
      };

      const { data: insertedContact, error } = await supabase
        .from('contacts')
        .insert(newContact)
        .select()
        .maybeSingle(); // Use maybeSingle to avoid PGRST116 if RLS blocks select after insert

      if (error) throw error;

      // Optimize: Add to local state instead of reloading all contacts
      if (insertedContact) {
        setContacts(prev => [...prev, (insertedContact as unknown as Contact)]);
      }

      // Reset form and close dialog
      setNewContactData({ firstName: "", lastName: "", phone: "", gender: "" });
      setShowAddContact(false);

      toast({
        title: "Contact Added",
        description: "New contact has been added successfully.",
      });

    } catch (error) {
      console.error('Error adding contact:', error);

      let errorMessage = "Failed to add contact.";

      // Postgres unique constraint violation code
      if ((error as any)?.code === '23505') {
        errorMessage = "This phone number is already registered to a contact you cannot access.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: (error as any)?.code === '23505' ? "Contact Exists" : "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAddingContact(false);
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
    const evtStartTime = eventData.startTime;
    const evtEndTime = eventData.endTime;

    // Parse start and end times
    const [startHour, startMin] = evtStartTime.split(':').map(Number);
    const [endHour, endMin] = evtEndTime.split(':').map(Number);
    const durationHours = endHour - startHour + (endMin - startMin) / 60;

    // Check if it's a food event
    const hasFood = eventDescription.includes('food') || eventDescription.includes('meal') ||
      eventDescription.includes('dinner') || eventDescription.includes('lunch') ||
      eventDescription.includes('iftar') || eventDescription.includes('breakfast');

    // Generate roles directly instead of empty timeline items
    const roles: VolunteerRole[] = [];

    const makeRole = (label: string, start: string, end: string, flexible: number) => ({
      id: crypto.randomUUID(),
      roleLabel: label,
      slotsBrother: 0,
      slotsSister: 0,
      slotsFlexible: flexible,
      shiftStartTime: start,
      shiftEndTime: end,
      notes: "",
      suggestedPOC: [] as string[]
    });

    // Setup crew
    const setupTime = addTimeMinutes(evtStartTime, -60);
    roles.push(makeRole("Setup Crew", setupTime, evtStartTime, 3));

    // Greeters/Registration
    roles.push(makeRole("Greeter / Registration", addTimeMinutes(evtStartTime, -15), addTimeMinutes(evtStartTime, 30), 2));

    // Food-specific roles
    if (hasFood) {
      const midTime = addTimeMinutes(evtStartTime, Math.floor(durationHours * 30));
      roles.push(makeRole("Food Server", midTime, addTimeMinutes(midTime, 60), 3));
    }

    // If long event, add ushers
    if (durationHours > 2) {
      roles.push(makeRole("Usher / Coordinator", evtStartTime, evtEndTime, 2));
    }

    // Cleanup crew
    roles.push(makeRole("Cleanup Crew", evtEndTime, addTimeMinutes(evtEndTime, 60), 3));

    // Wrap roles into a single itinerary item (backward compat)
    const generatedItinerary: ItineraryItem[] = [{
      id: crypto.randomUUID(),
      time: evtStartTime,
      title: "",
      description: "",
      volunteerRoles: roles
    }];

    setItinerary(generatedItinerary);
    setIsLoading(false);

    toast({
      title: "Roles Generated!",
      description: `Generated ${roles.length} volunteer roles based on your event details.`,
    });
  };

  const handleAIEventParsed = (data: ParsedEventData) => {
    // Fill in event data from AI parsed result
    setEventData(prev => ({
      ...prev,
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.date && { date: data.date }),
      ...(data.startTime && { startTime: data.startTime }),
      ...(data.endTime && { endTime: data.endTime }),
      ...(data.location && { location: data.location }),
    }));

    // Convert parsed roles into the itinerary format
    if (data.roles && data.roles.length > 0) {
      const roles: VolunteerRole[] = data.roles.map(role => ({
        id: generateId(),
        roleLabel: role.roleLabel,
        slotsBrother: role.slotsBrother,
        slotsSister: role.slotsSister,
        slotsFlexible: role.slotsFlexible,
        shiftStartTime: role.shiftStartTime || data.startTime || "00:00",
        shiftEndTime: role.shiftEndTime || data.endTime || "01:00",
        notes: role.notes || "",
        suggestedPOC: [],
      }));

      // Wrap in a single itinerary item container
      setItinerary([{
        id: generateId(),
        time: data.startTime || "00:00",
        title: "",
        description: "",
        volunteerRoles: roles,
      }]);
    }

    setHasUnsavedChanges(true);
  };

  const handleTemplateSelect = (template: any) => {
    if (!template) return;

    // Apply template data to the form
    if (template.details) {
      setEventData(prev => ({
        ...prev,
        title: template.details.title || prev.title,
        description: template.details.description || prev.description,
        location: template.details.location || prev.location,
        smsEnabled: template.details.sms_enabled ?? prev.smsEnabled,
        dayBeforeTime: template.details.day_before_time || prev.dayBeforeTime,
        dayOfTime: template.details.day_of_time || prev.dayOfTime
      }));


    }

    // Apply itinerary and volunteer roles (map roles by shift_start to itinerary time)
    if ((template.itineraries && template.itineraries.length > 0) || (template.volunteer_roles && template.volunteer_roles.length > 0)) {
      // Helper to normalize time for matching
      const getNormalizedTime = (t: string) => normalizeTime(t);

      const baseItinerary = (template.itineraries || []).map((item: any) => ({
        id: generateId(),
        time: getNormalizedTime(item.time_slot),
        title: item.activity,
        description: item.description || '',
        volunteerRoles: [] as any[]
      }));

      // Build a lookup from time_slot -> roles using the itinerary id when available
      const rolesByTime = new Map<string, any[]>();
      const roles = template.volunteer_roles || [];
      roles.forEach((role: any) => {
        const start = getNormalizedTime(role.shift_start);
        const arr = rolesByTime.get(start) || [];
        arr.push(role);
        rolesByTime.set(start, arr);
      });

      const itineraryWithRoles = baseItinerary.map((item: any) => {
        const rolesForTime = rolesByTime.get(item.time) || [];
        const convertedRoles = rolesForTime.map((role: any) => {
          // Debug: Log the raw values to help identify NaN issues
          console.log('Template role slot values:', {
            role_label: role.role_label,
            slots_brother: role.slots_brother,
            slots_sister: role.slots_sister,
            slots_flexible: role.slots_flexible,
            types: {
              brother: typeof role.slots_brother,
              sister: typeof role.slots_sister,
              flexible: typeof role.slots_flexible
            }
          });

          return {
            id: generateId(),
            roleLabel: role.role_label,
            slotsBrother: (Number(role.slots_brother) || 0),
            slotsSister: (Number(role.slots_sister) || 0),
            slotsFlexible: (Number(role.slots_flexible ?? 0) || 0),
            shiftStartTime: getNormalizedTime(role.shift_start) || '00:00',
            shiftEndTime: getNormalizedTime(role.shift_end_time || role.shift_end) || '01:00',
            notes: role.notes,
            suggestedPOC: role.suggested_poc ? [role.suggested_poc] : []
          };
        });
        return { ...item, volunteerRoles: convertedRoles };
      });

      setItinerary(itineraryWithRoles);
    }

    // Apply pre-event tasks
    if (template.pre_event_tasks && template.pre_event_tasks.length > 0) {
      const convertedTasks = template.pre_event_tasks.map((task: any) => ({
        id: generateId(),
        description: task.task_description,
        assignedTo: task.assigned_to || '',
        dueDate: task.due_date_offset_days ?
          new Date(Date.now() + task.due_date_offset_days * 24 * 60 * 60 * 1000) :
          new Date(),
        status: task.status
      }));
      setPreEventTasks(convertedTasks);
    }

    toast({
      title: "Template Applied!",
      description: `Template "${template.name}" has been applied to your event.`,
    });
  };

  const saveEvent = async (status: 'draft' | 'published') => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create events.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!eventData.title || !eventData.date || !eventData.startTime || !eventData.endTime || !eventData.location) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Title, Date, Start Time, End Time, Location).",
        variant: "destructive",
      });
      return;
    }

    // Validate time logic - allow overnight events
    if (eventData.startTime >= eventData.endTime) {
      // Check if this is an overnight event (valid for multi-day events like Ramadan)
      const isOvernight = isOvernightEvent(eventData.startTime, eventData.endTime);
      if (!isOvernight) {
        toast({
          title: "Validation Error",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        return;
      }
      // Allow overnight events - they will span to the next day
      console.log("Overnight event detected - allowing multi-day event");
    }

    setIsSaving(true);

    try {
      // Debug currentUser
      console.log('🔍 Current user:', currentUser);
      if (!currentUser || !currentUser.id) {
        throw new Error('User not authenticated or missing user ID');
      }

      const baseEventPayload = {
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start_datetime: localDateTimeToUTC(eventData.date, eventData.startTime),
        end_datetime: isOvernightEvent(eventData.startTime, eventData.endTime)
          ? localDateTimeToUTC(getNextDay(eventData.date), eventData.endTime)
          : localDateTimeToUTC(eventData.date, eventData.endTime),
        status,
        is_public: eventData.isPublic,
        sms_enabled: eventData.smsEnabled,
        day_before_time: eventData.dayBeforeTime,
        day_of_time: eventData.dayOfTime,
      } as const;

      // Debug payload validation
      console.log('🔍 Event payload validation:', {
        title: baseEventPayload.title,
        location: baseEventPayload.location,
        start_datetime: baseEventPayload.start_datetime,
        end_datetime: baseEventPayload.end_datetime,
        status: baseEventPayload.status,
        created_by: currentUser.id
      });

      // Validate required fields
      if (!baseEventPayload.title || !baseEventPayload.location || !baseEventPayload.start_datetime || !baseEventPayload.end_datetime) {
        throw new Error('Missing required fields in event payload');
      }

      let savedEventId = eventId;

      if (eventId) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(baseEventPayload)
          .eq('id', eventId);

        if (error) throw error;
      } else {
        // Create new event
        const insertPayload = { ...baseEventPayload, created_by: currentUser.id };
        console.log('🔍 Creating new event with payload:', insertPayload);

        const { data: newEvent, error } = await supabase
          .from('events')
          .insert(insertPayload)
          .select()
          .single();

        console.log('🔍 Event insert result:', { newEvent, error });
        if (error) {
          console.error('❌ Event insert error:', error);
          throw error;
        }
        if (!newEvent || !newEvent.id) {
          console.error('❌ No data returned from event insert');
          throw new Error('Failed to create event');
        }
        savedEventId = newEvent.id;
      }

      // Save itinerary and volunteer roles - SIMPLIFIED
      if (savedEventId && itinerary.length > 0) {
        // Normalize itinerary and roles to prevent duplicates
        const totalRoles = itinerary.reduce((total, item) => total + (item.volunteerRoles?.length || 0), 0);
        console.log('DEBUG: Before save -', itinerary.length, 'items with', totalRoles, 'roles');

        // Re-enable deduplication with conservative keys (time + title per item; exact-match per role)
        const normalizedItinerary = itinerary
          .filter((item, index, self) => {
            const key = `${item.time}__${item.title}`;
            return index === self.findIndex(i => `${i.time}__${i.title}` === key);
          })
          .map(item => ({
            ...item,
            volunteerRoles: (item.volunteerRoles || []).filter((role, rIndex, rSelf) => {
              const pocKey = Array.isArray(role.suggestedPOC) ? role.suggestedPOC.slice().sort().join(',') : (role.suggestedPOC || '');
              const key = `${role.roleLabel}__${role.slotsBrother}__${role.slotsSister}__${role.notes ?? ''}__${pocKey}`;
              return rIndex === rSelf.findIndex(rr => {
                const rrPocKey = Array.isArray(rr.suggestedPOC) ? rr.suggestedPOC.slice().sort().join(',') : (rr.suggestedPOC || '');
                const rrKey = `${rr.roleLabel}__${rr.slotsBrother}__${rr.slotsSister}__${rr.notes ?? ''}__${rrPocKey}`;
                return rrKey === key;
              });
            })
          }));

        console.log('DEBUG: After save -', normalizedItinerary.length, 'items with', normalizedItinerary.reduce((total, item) => total + (item.volunteerRoles?.length || 0), 0), 'roles');
        console.log('💾 Saving', normalizedItinerary.length, 'itinerary items (normalized)');

        // COMPLETELY DELETE ALL EXISTING DATA FIRST
        // Synchronize existing itineraries and roles without destructive deletes
        // 1) Read existing rows
        const { data: existingItins } = await supabase
          .from('itineraries')
          .select('id')
          .eq('event_id', savedEventId);
        const existingItinIds = new Set((existingItins || []).map(i => i.id as string));

        const { data: existingRoles } = await supabase
          .from('volunteer_roles')
          .select('id')
          .eq('event_id', savedEventId);
        const existingRoleIds = new Set((existingRoles || []).map(r => r.id as string));

        const seenRoleIds = new Set<string>();
        const tempToNewItinId = new Map<string, string>();

        // 2) Upsert itineraries and roles
        for (let index = 0; index < normalizedItinerary.length; index++) {
          const item = normalizedItinerary[index];
          console.log(`📝 Saving itinerary item ${index + 1}:`, item.time, item.title);

          let itineraryIdToUse = item.id;
          if (existingItinIds.has(item.id)) {
            const { error: upErr } = await supabase
              .from('itineraries')
              .update({
                time_slot: item.time,
                activity: item.title,
                description: item.description,
                duration_minutes: 60
              })
              .eq('id', item.id);
            if (upErr) { console.error('❌ Error updating itinerary item:', upErr); throw upErr; }
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from('itineraries')
              .insert({
                event_id: savedEventId,
                time_slot: item.time,
                activity: item.title,
                description: item.description,
                duration_minutes: 60
              })
              .select()
              .single();
            if (insErr) { console.error('❌ Error inserting itinerary item:', insErr); throw insErr; }
            if (!inserted || !inserted.id) {
              console.error('❌ No data returned from itinerary insert');
              throw new Error('Failed to create itinerary item');
            }
            itineraryIdToUse = inserted.id;
            tempToNewItinId.set(item.id, inserted.id);
          }

          // 3) Upsert roles for this itinerary
          if (item.volunteerRoles && item.volunteerRoles.length > 0) {
            console.log(`👥 Saving ${item.volunteerRoles.length} roles for ${item.time}`);
            for (const role of item.volunteerRoles) {
              // Debug: Log role data to identify null/empty time values
              console.log('🔍 Role before save:', {
                id: role.id,
                roleLabel: role.roleLabel,
                shiftStartTime: role.shiftStartTime,
                shiftEndTime: role.shiftEndTime,
                type: typeof role.shiftStartTime,
                isEmpty: role.shiftStartTime === '',
                isNull: role.shiftStartTime === null,
                isUndefined: role.shiftStartTime === undefined
              });

              // Ensure role has valid time values
              if (!role.shiftStartTime || role.shiftStartTime === '') {
                console.warn('⚠️ Role missing shiftStartTime, setting default:', role.roleLabel);
                role.shiftStartTime = '00:00';
              }
              if (!role.shiftEndTime || role.shiftEndTime === '') {
                console.warn('⚠️ Role missing shiftEndTime, setting default:', role.roleLabel);
                role.shiftEndTime = '01:00';
              }

              // Ensure end time is after start time (db has a CHECK constraint)
              const toMinutes = (t: string) => {
                const [h, m] = (t || '00:00').split(':').map(Number);
                const hh = Number.isFinite(h) ? h : 0;
                const mm = Number.isFinite(m) ? m : 0;
                return hh * 60 + mm;
              };
              const toHHMM = (mins: number) => {
                const m = Math.max(0, Math.min(23 * 60 + 59, mins));
                const hh = Math.floor(m / 60);
                const mm = m % 60;
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${pad(hh)}:${pad(mm)}`;
              };
              const startM = toMinutes(role.shiftStartTime);
              let endM = toMinutes(role.shiftEndTime);
              if (endM <= startM) {
                // bump to at least one hour after start
                endM = startM + 60;
                role.shiftEndTime = toHHMM(endM);
                console.warn('⏱ Adjusted shiftEndTime to be after start for role:', role.roleLabel, role.shiftEndTime);
              }

              // Resolve itinerary id if this item was newly inserted
              const resolvedItinId = tempToNewItinId.get(item.id) || itineraryIdToUse;
              if (existingRoleIds.has(role.id)) {
                const { error: updRoleErr } = await supabase
                  .from('volunteer_roles')
                  .update({
                    role_label: role.roleLabel,
                    slots_brother: role.slotsBrother,
                    slots_sister: role.slotsSister,
                    slots_flexible: role.slotsFlexible,
                    notes: role.notes,
                    suggested_poc: role.suggestedPOC,
                    shift_start: role.shiftStartTime,
                    shift_end_time: role.shiftEndTime,
                    shift_end: role.shiftEndTime,
                    itinerary_id: resolvedItinId
                  })
                  .eq('id', role.id);
                if (updRoleErr) { console.error('❌ Error updating role:', updRoleErr); throw updRoleErr; }
                seenRoleIds.add(role.id);
              } else {
                const { data: insRole, error: insRoleErr } = await supabase
                  .from('volunteer_roles')
                  .insert({
                    event_id: savedEventId,
                    role_label: role.roleLabel,
                    slots_brother: role.slotsBrother,
                    slots_sister: role.slotsSister,
                    slots_flexible: role.slotsFlexible,
                    notes: role.notes,
                    suggested_poc: role.suggestedPOC,
                    shift_start: role.shiftStartTime,
                    shift_end_time: role.shiftEndTime,
                    shift_end: role.shiftEndTime,
                    itinerary_id: resolvedItinId
                  })
                  .select()
                  .single();
                if (insRoleErr) { console.error('❌ Error inserting role:', insRoleErr); throw insRoleErr; }
                if (insRole?.id) seenRoleIds.add(insRole.id);
              }
            }
          }
        }

        // 4) Optionally remove roles that are no longer present but only if they have no volunteers
        const staleRoleIds = (existingRoles || [])
          .map(r => r.id as string)
          .filter(rid => !seenRoleIds.has(rid));
        if (staleRoleIds.length > 0) {
          const { data: volsUsingRoles } = await supabase
            .from('volunteers')
            .select('role_id')
            .in('role_id', staleRoleIds);
          const rolesWithVols = new Set((volsUsingRoles || []).map(v => v.role_id as string));
          const deletable = staleRoleIds.filter(id => !rolesWithVols.has(id));
          if (deletable.length > 0) {
            const { error: delErr } = await supabase
              .from('volunteer_roles')
              .delete()
              .in('id', deletable);
            if (delErr) { console.error('❌ Error deleting stale roles:', delErr); }
          }
        }

        console.log('✅ Successfully saved all data');
      }

      setLastSaved(new Date());

      // Update lastSavedData to mark everything as saved
      const currentState = JSON.stringify({
        eventData,
        itinerary,
        additionalDetails,
        preEventTasks
      });
      setLastSavedData(currentState);
      setHasUnsavedChanges(false);

      // Create event slug for the volunteer signup link
      const createReadableEventSlug = (title: string, id: string) => {
        const baseSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();

        // Add last 4 characters of ID to handle duplicates
        const uniqueSuffix = id.slice(-4);
        return `${baseSlug}-${uniqueSuffix}`;
      };

      // Generate the volunteer signup link
      const eventSlug = createReadableEventSlug(eventData.title, savedEventId);
      const baseVolunteerLink = `${window.location.origin}/${eventSlug}`;

      // Generate tracking URLs
      const { generateShareableLink, generateQRCodeUrl } = await import('@/utils/analyticsUtils');
      const volunteerLink = generateShareableLink(baseVolunteerLink, savedEventId, 'direct', 'link', 'event_signup');
      const qrCodeUrl = generateQRCodeUrl(baseVolunteerLink, savedEventId);

      // Copy the link to clipboard
      try {
        await navigator.clipboard.writeText(volunteerLink);

        toast({
          title: status === 'published' ? "Event Published!" : "Draft Saved!",
          description: status === 'published'
            ? "Your event has been published and the volunteer signup link has been copied to clipboard!"
            : "Your progress has been saved as a draft and the event link has been copied to clipboard!",
        });
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);

        toast({
          title: status === 'published' ? "Event Published!" : "Draft Saved!",
          description: status === 'published'
            ? "Your event has been published and is now live."
            : "Your progress has been saved as a draft.",
        });
      }

      // Navigate to dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error('Error saving event:', error);

      // Provide more specific error messages
      let errorMessage = "Failed to save event. Please try again.";

      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${error.message}`;
      } else if (error && typeof error === 'string') {
        errorMessage = `Error: ${error}`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save functionality
  const getCurrentEventState = useCallback(() => {
    return JSON.stringify({
      eventData,
      itinerary,
      additionalDetails,
      preEventTasks
    });
  }, [eventData, itinerary, additionalDetails, preEventTasks]);

  const checkForUnsavedChanges = useCallback(() => {
    const currentState = getCurrentEventState();
    const hasChanges = currentState !== lastSavedData;
    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  }, [getCurrentEventState, lastSavedData]);

  const autoSaveDraft = useCallback(async () => {
    if (!currentUser || !checkForUnsavedChanges()) return;

    setIsAutoSaving(true);
    try {
      await saveEvent('draft');
      const currentState = getCurrentEventState();
      setLastSavedData(currentState);
      setHasUnsavedChanges(false);
      console.log('Auto-saved draft successfully');
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentUser, checkForUnsavedChanges, saveEvent, getCurrentEventState]);

  // Set up auto-save interval
  useEffect(() => {
    if (currentUser && hasUnsavedChanges) {
      const interval = setInterval(autoSaveDraft, 30000); // Auto-save every 30 seconds
      setAutoSaveInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [currentUser, hasUnsavedChanges, autoSaveDraft]);

  // Check for unsaved changes whenever data changes
  useEffect(() => {
    if (lastSavedData) {
      checkForUnsavedChanges();
    }
  }, [eventData, itinerary, additionalDetails, preEventTasks, checkForUnsavedChanges]);

  // Beforeunload event handler to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleDeleteEvent = async () => {
    if (!eventId) return;

    try {
      await softDeleteEvent(eventId, eventData.title);
      toast({
        title: "Event Deleted",
        description: "Event has been moved to recently deleted.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    }
    setShowDeleteDialog(false);
  };

  const prefillTestData = () => {
    setEventData({
      title: "Community Iftar 2025",
      date: "2024-03-15",
      startTime: "18:00",
      endTime: "21:00",
      location: "Islamic Center Main Hall",
      description: "Join us for a community iftar dinner during Ramadan. We'll break our fast together and enjoy traditional foods.",
      status: "draft",
      isPublic: true,
      smsEnabled: true,
      dayBeforeTime: "19:00",
      dayOfTime: "15:00"
    });

    // Prefill itinerary with sample volunteer roles
    setItinerary([
      {
        id: crypto.randomUUID(),
        time: "16:00",
        title: "Setup & Preparation",
        description: "Tables, chairs, decorations setup",
        volunteerRoles: [
          {
            id: crypto.randomUUID(),
            roleLabel: "Setup Coordinator",
            slotsBrother: 2,
            slotsSister: 1,
            slotsFlexible: 0,
            shiftStartTime: "16:00",
            shiftEndTime: "17:00",
            notes: "Oversee table and chair arrangement",
            suggestedPOC: []
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        time: "17:30",
        title: "Volunteer Briefing",
        description: "Brief all volunteers on their roles",
        volunteerRoles: []
      },
      {
        id: crypto.randomUUID(),
        time: "18:00",
        title: "Guest Registration",
        description: "Welcome and check-in guests",
        volunteerRoles: [
          {
            id: crypto.randomUUID(),
            roleLabel: "Greeter",
            slotsBrother: 1,
            slotsSister: 2,
            slotsFlexible: 0,
            shiftStartTime: "18:00",
            shiftEndTime: "19:00",
            notes: "Welcome guests at entrance",
            suggestedPOC: []
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        time: "19:30",
        title: "Maghrib Prayer",
        description: "Community prayer time",
        volunteerRoles: []
      },
      {
        id: crypto.randomUUID(),
        time: "19:45",
        title: "Iftar Dinner Service",
        description: "Serve meals to community",
        volunteerRoles: [
          {
            id: crypto.randomUUID(),
            roleLabel: "Food Server",
            slotsBrother: 3,
            slotsSister: 4,
            slotsFlexible: 0,
            shiftStartTime: "19:45",
            shiftEndTime: "20:45",
            notes: "Serve food to guests",
            suggestedPOC: []
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        time: "20:30",
        title: "Community Program",
        description: "Brief talks and announcements",
        volunteerRoles: []
      },
      {
        id: crypto.randomUUID(),
        time: "21:00",
        title: "Cleanup & Breakdown",
        description: "Clean venue and pack up",
        volunteerRoles: [
          {
            id: crypto.randomUUID(),
            roleLabel: "Cleanup Crew",
            slotsBrother: 2,
            slotsSister: 2,
            slotsFlexible: 0,
            shiftStartTime: "21:00",
            shiftEndTime: "22:00",
            notes: "Clean tables and pack up supplies",
            suggestedPOC: []
          }
        ]
      }
    ]);

    setAdditionalDetails({});

    toast({
      title: "Test data loaded!",
      description: "Form has been filled with sample event data including itinerary and volunteer roles.",
    });
  };

  // Load event data including itinerary - SIMPLIFIED APPROACH
  const loadEventData = useCallback(async (id: string) => {
    try {
      console.log('🔄 Starting fresh load for event:', id);
      setIsLoadingEventData(true);

      // COMPLETELY CLEAR ALL STATE FIRST
      setItinerary([]);
      setEventData({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        description: "",
        status: "draft",
        isPublic: true,
        smsEnabled: false,
        dayBeforeTime: "19:00",
        dayOfTime: "15:00"
      });

      // Load event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;

      if (eventData) {
        console.log('✅ Loaded event data');
        setEventData({
          title: eventData.title,
          date: eventData.start_datetime.split('T')[0],
          startTime: new Date(eventData.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: new Date(eventData.end_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          location: eventData.location,
          description: eventData.description || "",
          status: eventData.status,
          isPublic: eventData.is_public ?? true,
          smsEnabled: eventData.sms_enabled,
          dayBeforeTime: eventData.day_before_time,
          dayOfTime: eventData.day_of_time
        });

        // Load itinerary data
        const { data: itineraryData, error: itineraryError } = await supabase
          .from('itineraries')
          .select('*')
          .eq('event_id', id)
          .order('time_slot', { ascending: true });

        if (itineraryError) throw itineraryError;

        // Load volunteer roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('volunteer_roles')
          .select('*')
          .eq('event_id', id);

        if (rolesError) throw rolesError;

        console.log('👥 Raw volunteer roles loaded:', rolesData?.map(r => ({
          id: r.id,
          role_label: r.role_label,
          shift_start: r.shift_start,
          itinerary_id: r.itinerary_id
        })));

        console.log('📊 Raw data loaded:', {
          itinerary: itineraryData?.length || 0,
          roles: rolesData?.length || 0
        });

        // IMPROVED APPROACH: Prevent duplication by using unique IDs and better matching
        // Group itinerary rows by composite key (time_slot + activity)
        const itineraryGroups = new Map<string, any[]>();
        for (const row of itineraryData || []) {
          const key = `${row.time_slot}__${row.activity}`;
          const list = itineraryGroups.get(key) || [];
          list.push(row);
          itineraryGroups.set(key, list);
        }

        // Handle both new (itinerary_id) and existing (shift_start) volunteer roles
        const rolesByItineraryId = new Map<string, any[]>();
        const rolesByTime = new Map<string, any[]>();

        for (const role of rolesData || []) {
          if (role.itinerary_id) {
            // New format: role is linked to specific itinerary item
            const key = role.itinerary_id as string;
            const arr = rolesByItineraryId.get(key) || [];
            if (!arr.find(r => r.id === role.id)) arr.push(role);
            rolesByItineraryId.set(key, arr);
          } else if (role.shift_start) {
            // Legacy format: role is linked by time slot
            const key = role.shift_start as string;
            const arr = rolesByTime.get(key) || [];
            if (!arr.find(r => r.id === role.id)) arr.push(role);
            rolesByTime.set(key, arr);
          }
        }

        console.log('🔗 Role mapping:', {
          byItineraryId: Array.from(rolesByItineraryId.keys()),
          byTime: Array.from(rolesByTime.keys()),
          totalRoles: rolesData?.length || 0
        });

        let combinedItinerary: ItineraryItem[] = Array.from(itineraryGroups.entries()).map(([key, group]) => {
          // Try to pick a stable representative row for this group:
          // 1) If any role explicitly references an itinerary_id in this group, prefer that row
          let representative = group[0];
          const roleLinkedRow = group.find(gr => rolesByItineraryId.has(gr.id));
          if (roleLinkedRow) representative = roleLinkedRow;

          const item = representative;
          let srcRoles: any[] = [];

          // First try strict match by itinerary_id (new format)
          srcRoles = rolesByItineraryId.get(item.id) || [];

          // Fallback: match by time slot (legacy format) if no linked roles exist
          if (srcRoles.length === 0) {
            srcRoles = rolesByTime.get(item.time_slot as string) || [];
            console.log(`⏰ ${item.time_slot}: Using time-based fallback for ${srcRoles.length} roles`);
          } else {
            console.log(`🔗 ${item.time_slot}: Using itinerary_id link for ${srcRoles.length} roles`);
          }

          const itemRoles = srcRoles.map(role => ({
            id: role.id,
            roleLabel: role.role_label,
            slotsBrother: (Number(role.slots_brother) || 0),
            slotsSister: (Number(role.slots_sister) || 0),
            slotsFlexible: (Number(role.slots_flexible ?? 0) || 0),
            shiftStartTime: role.shift_start || "00:00",
            shiftEndTime: role.shift_end_time || role.shift_end || "01:00",
            notes: role.notes || "",
            suggestedPOC: role.suggested_poc || []
          }));

          console.log(`📋 ${item.time_slot}: ${item.activity} → ${itemRoles.length} roles`);

          return {
            id: item.id,
            time: item.time_slot,
            title: item.activity,
            description: item.description || "",
            volunteerRoles: itemRoles
          };
        });

        let totalLoadedRoles = combinedItinerary.reduce((total, item) => total + (item.volunteerRoles?.length || 0), 0);
        console.log('DEBUG: Loaded data -', combinedItinerary.length, 'items with', totalLoadedRoles, 'roles');

        // Debug: Log each item and its roles
        combinedItinerary.forEach((item, index) => {
          console.log(`📋 Item ${index + 1}: ${item.time} - ${item.title} (${item.volunteerRoles?.length || 0} roles)`);
          item.volunteerRoles?.forEach((role, roleIndex) => {
            console.log(`  👥 Role ${roleIndex + 1}: ${role.roleLabel} (${role.slotsBrother}/${role.slotsSister}) - POCs: ${Array.isArray(role.suggestedPOC) ? role.suggestedPOC.length : 'legacy'}`);
          });
        });

        // Fallback: if there are roles but no itinerary rows (or zero total roles attached), build basic itinerary from roles
        if ((itineraryData?.length || 0) === 0 && (rolesData?.length || 0) > 0) {
          console.log('⚠️ No itineraries found but roles exist. Building fallback itinerary from roles.');
          const groupedByStart: Record<string, any[]> = {};
          for (const role of rolesData || []) {
            const start = role.shift_start || '00:00';
            if (!groupedByStart[start]) groupedByStart[start] = [];
            groupedByStart[start].push(role);
          }
          combinedItinerary = Object.keys(groupedByStart).sort().map((time) => ({
            id: generateId(),
            time,
            title: 'Volunteer Shift',
            description: '',
            volunteerRoles: groupedByStart[time].map((role: any) => ({
              id: role.id,
              roleLabel: role.role_label,
              slotsBrother: (Number(role.slots_brother) || 0),
              slotsSister: (Number(role.slots_sister) || 0),
              slotsFlexible: (Number(role.slots_flexible ?? 0) || 0),
              shiftStartTime: role.shift_start || '00:00',
              shiftEndTime: role.shift_end_time || role.shift_end || '',
              notes: role.notes || '',
              suggestedPOC: role.suggested_poc || []
            }))
          }));
          totalLoadedRoles = combinedItinerary.reduce((total, item) => total + (item.volunteerRoles?.length || 0), 0);
          console.log('✅ Fallback itinerary built -', combinedItinerary.length, 'items with', totalLoadedRoles, 'roles');
        }

        setItinerary(combinedItinerary);
      }
    } catch (error) {
      console.error('❌ Error loading event data:', error);
      toast({
        title: "Error",
        description: "Failed to load event data.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEventData(false);
    }
  }, [toast]);

  // Effects
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      await loadContacts(user.id);
    };

    checkUser();
  }, [navigate]);

  // Load template if provided in navigation state
  useEffect(() => {
    const loadTemplateFromState = async () => {
      if (location.state?.templateId && currentUser) {
        console.log('Loading template with ID:', location.state.templateId);
        try {
          // Query template and related data separately to debug any issues
          const { data: template, error } = await supabase
            .from('event_templates')
            .select(`
              *,
              event_template_details(*),
              event_template_itineraries(*),
              event_template_pre_event_tasks(*)
            `)
            .eq('id', location.state.templateId)
            .single();

          if (error) throw error;

          console.log('Template base data:', template);
          console.log('Template user_id:', template.user_id);
          console.log('Template is_public:', template.is_public);
          console.log('Template deleted_at:', template.deleted_at);

          // Query volunteer roles separately
          const { data: volunteerRoles, error: rolesError } = await supabase
            .from('event_template_volunteer_roles')
            .select('*')
            .eq('template_id', location.state.templateId);

          if (rolesError) {
            console.error('Error loading volunteer roles:', rolesError);
          } else {
            console.log('Volunteer roles loaded separately:', volunteerRoles);
          }

          // Combine the data
          const templateWithRoles = {
            ...template,
            event_template_volunteer_roles: volunteerRoles || []
          };

          if (error) throw error;

          console.log('Template data loaded:', templateWithRoles);
          console.log('Template volunteer roles:', templateWithRoles.event_template_volunteer_roles);
          console.log('Template itineraries:', templateWithRoles.event_template_itineraries);

          if (templateWithRoles) {
            // Apply template data
            if (templateWithRoles.event_template_details?.[0]) {
              const details = templateWithRoles.event_template_details[0];
              console.log('Applying template details:', details);
              setEventData(prev => ({
                ...prev,
                title: details.title || prev.title,
                description: details.description || prev.description,
                location: details.location || prev.location,
                smsEnabled: details.sms_enabled ?? prev.smsEnabled,
                dayBeforeTime: details.day_before_time || prev.dayBeforeTime,
                dayOfTime: details.day_of_time || prev.dayOfTime
              }));


            }

            // Create itinerary with volunteer roles in a single operation
            if (templateWithRoles.event_template_itineraries || templateWithRoles.event_template_volunteer_roles) {
              console.log('Applying template itineraries:', templateWithRoles.event_template_itineraries);
              console.log('Applying template volunteer roles:', templateWithRoles.event_template_volunteer_roles);

              // Convert volunteer roles first
              const convertedRoles = templateWithRoles.event_template_volunteer_roles ? templateWithRoles.event_template_volunteer_roles.map((role: any) => ({
                id: generateId(),
                roleLabel: role.role_label,
                slotsBrother: (Number(role.slots_brother) || 0),
                slotsSister: (Number(role.slots_sister) || 0),
                slotsFlexible: (Number(role.slots_flexible ?? 0) || 0),
                shiftStartTime: role.shift_start || '00:00',
                shiftEndTime: role.shift_end_time || role.shift_end || '01:00',
                notes: role.notes,
                suggestedPOC: role.suggested_poc ? [role.suggested_poc] : []
              })) : [];

              console.log('Converted volunteer roles:', convertedRoles);

              // Group converted roles by their start time to assign to matching itinerary items
              const rolesByStartTime: Record<string, typeof convertedRoles> = {};
              for (const r of convertedRoles) {
                const key = normalizeTime(r.shiftStartTime);
                if (!rolesByStartTime[key]) rolesByStartTime[key] = [];
                rolesByStartTime[key].push(r);
              }

              // Create itinerary assigning only the roles that match the item's time slot
              const convertedItinerary = (templateWithRoles.event_template_itineraries || []).map((item: any) => {
                const itemTime = normalizeTime(item.time_slot);
                return {
                  id: generateId(),
                  time: itemTime,
                  title: item.activity, // Map activity to title
                  description: item.description || '',
                  volunteerRoles: rolesByStartTime[itemTime] ? [...rolesByStartTime[itemTime]] : []
                };
              });

              console.log('Final itinerary with volunteer roles:', convertedItinerary);
              setItinerary(convertedItinerary);
            }

            if (templateWithRoles.event_template_pre_event_tasks) {
              console.log('Applying template pre-event tasks:', templateWithRoles.event_template_pre_event_tasks);
              const convertedTasks = templateWithRoles.event_template_pre_event_tasks.map((task: any) => ({
                id: generateId(),
                title: task.task_description, // Map task_description to title
                description: task.description || '',
                dueDateOffsetDays: task.due_date_offset_days,
                assignedTo: task.assigned_to ? [task.assigned_to] : [],
                status: task.status || 'pending'
              }));
              setPreEventTasks(convertedTasks);
            }

            // Store template info in location state for the SaveAsTemplateDialog
            if (location.state?.templateId) {
              navigate(location.pathname, {
                state: {
                  ...location.state,
                  templateName: templateWithRoles.name
                }
              });
            }

            toast({
              title: "Template Applied!",
              description: `Template "${templateWithRoles.name}" has been applied to your event.`,
            });
          }
        } catch (error) {
          console.error('Error loading template:', error);
          toast({
            title: "Error",
            description: "Failed to load template data.",
            variant: "destructive",
          });
        }
      }
    };

    loadTemplateFromState();
  }, [location.state?.templateId, currentUser]);

  // Reset loaded state when eventId changes
  useEffect(() => {
    if (eventId) {
      setHasLoadedEventData(false);
      setIsLoadingEventData(false);
    }
  }, [eventId]);

  // Separate effect for loading event data to prevent multiple calls
  useEffect(() => {
    if (eventId && currentUser && !hasLoadedEventData && !isLoadingEventData) {
      // Only load if not already loaded and not currently loading
      console.log('Loading fresh event data for:', eventId);
      setHasLoadedEventData(true);
      setIsLoadingEventData(true);
      loadEventData(eventId);
    }
  }, [eventId, currentUser, loadEventData, hasLoadedEventData, isLoadingEventData]);

  return (
    <div className="min-h-screen bg-white/5 md:bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-4 md:py-6 lg:py-8">
        {/* Page Header - Compact on mobile */}
        <div className="mb-5 md:mb-8">
          {/* Back Button - Smaller on mobile */}
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-white/40 md:text-white/50 hover:text-foreground hover:bg-white/10 h-10 md:h-auto px-2 md:px-4 -ml-2"
              >
                <ChevronLeft className="w-5 h-5 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="text-sm md:text-base">Back</span>
              </Button>
            </div>
            {/* Template Selector Button moved to header */}
            {!eventId && (
              <div className="md:hidden">
                <TemplateSelector
                  onTemplateSelect={handleTemplateSelect}
                  disabled={eventId && !hasEditPermission}
                  compact={true}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground md:text-foreground mb-1 md:mb-2 tracking-tight">
                {eventId ? "Edit Event" : "Create Event"}
              </h1>
              <p className="text-white/40 md:text-white/50 text-sm md:text-base lg:text-lg leading-relaxed">
                {eventId ? "Update your event details" :
                  currentStep === 1 ? "Let's start with the basics" :
                    currentStep === 2 ? "Add activities and volunteer roles" :
                      "Review and publish your event"
                }
              </p>
              {/* Template Indicator */}
              {location.state?.templateId && location.state?.templateName && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gold-400 bg-gold-400/10 px-3 py-2 rounded-lg border border-gold-400/20">
                  <FileText className="w-4 h-4" />
                  <span>Working from template: <strong>{location.state.templateName}</strong></span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(location.pathname, { state: {} })}
                    className="h-6 px-2 text-gold-400 hover:text-gold-300 hover:bg-gold-400/15"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Desktop Template Selector */}
              {!eventId && (
                <div className="hidden md:block">
                  <TemplateSelector
                    onTemplateSelect={handleTemplateSelect}
                    disabled={eventId && !hasEditPermission}
                    compact={true}
                  />
                </div>
              )}

              {/* Contextual Actions */}
              <div className="flex flex-col sm:flex-row gap-3">

                {/* Save Draft and Test Features */}
                <div className="flex items-center gap-3">
                  {/* Save Draft button - shown by default */}
                  {eventId && hasEditPermission && (
                    <Button
                      variant="outline"
                      onClick={() => saveEvent('draft')}
                      disabled={!canProceed() || isSaving}
                      className="border-yellow-300 text-amber-300 hover:bg-yellow-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Draft"}
                    </Button>
                  )}

                  {/* Test Features - only shown when Shift is pressed */}
                  {isShiftPressed && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Toggle
                          pressed={hideTestFeatures}
                          onPressedChange={setHideTestFeatures}
                          className="data-[state=on]:bg-gold-400 data-[state=on]:text-white"
                        >
                          {hideTestFeatures ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        </Toggle>
                        <span className="text-sm text-white/40">Test Features</span>
                      </div>

                      {!eventId && (
                        <Button
                          variant="ghost"
                          onClick={prefillTestData}
                          className="h-10 px-4 text-white/50 hover:text-gold-300 hover:bg-white/10"
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          Load Test Data
                        </Button>
                      )}
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Autosave Indicator */}
        {lastSaved && (
          <div className="mt-4 text-sm text-white/40">
            Saved • {lastSaved.toLocaleTimeString()}
          </div>
        )}

        {/* Progress Stepper - Mobile Optimized */}
        <div className="mb-4 md:mb-6 lg:mb-8 bg-white/5 rounded-2xl md:rounded-xl border border-white/10 md:border-white/10 px-3 py-3 md:px-6 md:py-4 overflow-x-auto scrollbar-hide shadow-sm md:shadow-none">
          <StepProgressBar
            steps={steps}
            currentStep={currentStep}
            onStepClick={goToStep}
            showProgressBar={true}
            showStepLabel={true}
          />
        </div>

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="col-span-1 lg:col-span-2">
            {/* Event Templates - Only visible during Basic Info step */}


            <Card className="border-0 md:border shadow-none md:shadow-sm bg-transparent md:bg-white/5 rounded-none md:rounded-xl">
              <CardContent className="p-0 md:p-6">
                {/* Step 1: Basic Info */}
                {logicalCurrentStep === 1 && (
                  <div className="space-y-5 md:space-y-6">
                    {/* AI Text-to-Event */}
                    {!eventId && (
                      <AITextToEventInput
                        onEventParsed={handleAIEventParsed}
                        disabled={eventId && !hasEditPermission}
                      />
                    )}

                    {/* Event Name Section */}
                    <SectionCard title="Event Name" className="md:bg-transparent md:border-0 md:p-0 md:shadow-none">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm md:text-xs font-semibold text-white/50 md:block hidden">
                          Event Title *
                        </Label>
                        <Input
                          id="title"
                          value={eventData.title}
                          onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                          placeholder="e.g., Community Iftar 2024"
                          className="h-12 md:h-11 rounded-xl border-2 border-white/10 focus-visible:ring-gold-400 text-lg md:text-sm font-medium placeholder:text-white/30 placeholder:font-normal"
                          disabled={eventId && !hasEditPermission}
                        />
                      </div>
                    </SectionCard>

                    {/* Date & Time Section */}
                    <SectionCard title="Date & Time" className="md:bg-transparent md:border-0 md:p-0 md:shadow-none">
                      <div className="space-y-4">
                        {/* Date Picker - Native iOS on mobile, Custom on desktop */}
                        <div className="space-y-2">
                          <Label htmlFor="date" className="text-sm md:text-xs font-semibold text-white/50 md:block hidden">
                            Date *
                          </Label>

                          {/* Mobile: Native iOS Date Picker */}
                          <Input
                            type="date"
                            id="date-mobile"
                            value={eventData.date || ""}
                            onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                            className="md:hidden h-12 w-full block bg-white/5 text-foreground rounded-xl border-2 border-white/10 focus-visible:ring-gold-400 text-base font-medium appearance-none"
                            style={{ minHeight: '3rem' }}
                            disabled={eventId && !hasEditPermission}
                          />

                          {/* Desktop: Custom Calendar Popover */}
                          <div className="hidden md:block">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal h-11 rounded-xl border-2 border-white/10 hover:border-white/20 text-sm bg-white/5"
                                  disabled={eventId && !hasEditPermission}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {eventData.date ? dateFromYMDLocal(eventData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={eventData.date ? dateFromYMDLocal(eventData.date) : undefined}
                                  defaultMonth={eventData.date ? dateFromYMDLocal(eventData.date) : new Date()}
                                  onSelect={(d: Date | undefined) => d && setEventData({ ...eventData, date: formatYMDLocal(d) })}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Time Pickers - Native iOS on mobile, Custom on desktop */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startTime" className="text-sm md:text-xs font-semibold text-white/50">
                              Start Time *
                            </Label>

                            {/* Mobile: Native iOS Time Picker */}
                            <Input
                              type="time"
                              id="startTime-mobile"
                              value={eventData.startTime || ""}
                              onChange={(e) => {
                                const newStart = e.target.value;
                                let newEnd = eventData.endTime;
                                if (newEnd && newEnd <= newStart) {
                                  const bumped = addTimeMinutes(newStart, 15);
                                  newEnd = bumped > newStart ? bumped : "23:59";
                                }
                                setEventData({ ...eventData, startTime: newStart, endTime: newEnd });
                              }}
                              className="md:hidden h-12 w-full block bg-white/5 text-foreground rounded-xl border-2 border-white/10 focus-visible:ring-gold-400 text-base font-medium appearance-none"
                              style={{ minHeight: '3rem' }}
                              disabled={eventId && !hasEditPermission}
                            />

                            {/* Desktop: Custom Time Input */}
                            <div className="hidden md:block">
                              <TimeInput12h
                                id="startTime"
                                value={eventData.startTime}
                                onChange={(newStart) => {
                                  let newEnd = eventData.endTime;
                                  if (newEnd && newEnd <= newStart) {
                                    const bumped = addTimeMinutes(newStart, 15);
                                    newEnd = bumped > newStart ? bumped : "23:59";
                                  }
                                  setEventData({ ...eventData, startTime: newStart, endTime: newEnd });
                                }}
                                className="h-11 border-2 border-white/10 focus-visible:ring-gold-400 text-sm"
                                disabled={eventId && !hasEditPermission}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="endTime" className="text-sm md:text-xs font-semibold text-white/50">
                              End Time *
                            </Label>

                            {/* Mobile: Native iOS Time Picker */}
                            <Input
                              type="time"
                              id="endTime-mobile"
                              value={eventData.endTime || ""}
                              onChange={(e) => {
                                setEventData({ ...eventData, endTime: e.target.value });
                              }}
                              className="md:hidden h-12 w-full block bg-white/5 text-foreground rounded-xl border-2 border-white/10 focus-visible:ring-gold-400 text-base font-medium appearance-none"
                              style={{ minHeight: '3rem' }}
                              disabled={eventId && !hasEditPermission}
                            />

                            {/* Desktop: Custom Time Input */}
                            <div className="hidden md:block">
                              <TimeInput12h
                                id="endTime"
                                value={eventData.endTime}
                                onChange={(newEnd) => {
                                  setEventData({ ...eventData, endTime: newEnd });
                                }}
                                className="h-11 border-2 border-white/10 focus-visible:ring-gold-400 text-sm"
                                disabled={eventId && !hasEditPermission}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Overnight event indicator */}
                        {eventData.startTime && eventData.endTime && isOvernightEvent(eventData.startTime, eventData.endTime) && (
                          <div className="flex items-center gap-2 text-sm text-gold-400 bg-gold-400/10 p-3 rounded-xl">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Overnight event - ends next day</span>
                          </div>
                        )}
                      </div>
                    </SectionCard>

                    {/* Location Section */}
                    <SectionCard title="Location" className="md:bg-transparent md:border-0 md:p-0 md:shadow-none">
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-sm md:text-xs font-semibold text-white/50 md:block hidden">
                          Location *
                        </Label>
                        <LocationInput
                          value={eventData.location}
                          onChange={(value) => setEventData({ ...eventData, location: value })}
                          placeholder="Select or type a location..."
                          disabled={eventId && !hasEditPermission}
                          className="h-12 md:h-11"
                        />
                      </div>
                    </SectionCard>

                    {/* Description Section - Collapsible on mobile */}
                    <SectionCard
                      title="Description"
                      collapsible={true}
                      defaultExpanded={!!eventData.description}
                      className="md:bg-transparent md:border-0 md:p-0 md:shadow-none"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm md:text-xs font-semibold text-white/50 md:block hidden">
                          Description *
                        </Label>
                        <Textarea
                          id="description"
                          value={eventData.description}
                          onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                          placeholder="Describe your event..."
                          rows={4}
                          className="border-2 border-white/10 focus-visible:ring-gold-400 rounded-xl resize-none text-base md:text-sm min-h-[120px] md:min-h-[100px]"
                          disabled={eventId && !hasEditPermission}
                        />
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Step 2: Event Planning (Itinerary & Volunteer Roles) */}
                {logicalCurrentStep === 2 && (
                  <div className="space-y-6">
                    <ItineraryEditor
                      itinerary={itinerary}
                      onItineraryChange={handleItineraryChange}
                      startTime={eventData.startTime}
                      endTime={eventData.endTime}
                      isGenerated={itinerary.length > 0}
                      disabled={eventId && !hasEditPermission}
                      onGenerateItinerary={generateItinerary}
                      isGenerating={isLoading}
                      eventTitle={eventData.title}
                      eventDescription={eventData.description}
                      contacts={contacts}
                      onAddContact={() => setShowAddContact(true)}
                      showValidation={showValidation}
                    />
                  </div>
                )}

                {/* Step 3: Enhanced Details - Only show when hideTestFeatures is false */}
                {logicalCurrentStep === 3 && !hideTestFeatures && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Enhanced Event Details</h2>
                    <p className="text-white/50 mb-6">
                      Add additional preferences to help provide better suggestions for volunteer roles and event planning.
                    </p>

                    <AdditionalDetailsWizard
                      details={additionalDetails}
                      onDetailsChange={setAdditionalDetails}
                      isExpanded={true}
                      onToggleExpand={() => { }}
                      disabled={eventId && !hasEditPermission}
                    />
                  </div>
                )}

                {/* Step 4: Pre-Event Tasks - Only show when hideTestFeatures is false */}
                {logicalCurrentStep === 4 && !hideTestFeatures && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Pre-Event Task Planning</h2>
                    <p className="text-white/50 mb-6">
                      Create and assign tasks needed before your event.
                    </p>
                    <PreEventTasksManager
                      tasks={preEventTasks}
                      onTasksChange={setPreEventTasks}
                      contacts={contacts}
                      eventDate={eventData.date}
                      eventDescription={eventData.description}
                      disabled={eventId && !hasEditPermission}
                    />
                  </div>
                )}

                {/* Step 5: Review & Publish */}
                {logicalCurrentStep === 5 && (
                  <div className="space-y-5 md:space-y-6">
                    {/* Mobile: Beautiful Event Preview Card */}
                    <div className="md:hidden">
                      <div className="bg-gradient-to-br from-navy-800 via-navy-800/90 to-navy-800/80 rounded-3xl border border-white/10 shadow-lg overflow-hidden">
                        {/* Event Header */}
                        <div className="p-5 pb-4">
                          <h2 className="text-2xl font-bold text-foreground leading-tight">
                            {eventData.title || "Untitled Event"}
                          </h2>

                          {/* Date & Time Badge */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-medium text-white/70">
                              <Calendar className="w-4 h-4 text-gold-400" />
                              {eventData.date ? dateFromYMDLocal(eventData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : "No date"}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-medium text-white/70">
                              <Clock className="w-4 h-4 text-gold-400" />
                              {formatTime24To12(eventData.startTime) || "--:--"} - {formatTime24To12(eventData.endTime) || "--:--"}
                              {eventData.startTime && eventData.endTime && isOvernightEvent(eventData.startTime, eventData.endTime) && (
                                <span className="text-xs text-gold-400/70">(+1)</span>
                              )}
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-start gap-2 mt-3 text-white/50">
                            <MapPin className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{eventData.location || "No location set"}</span>
                          </div>
                        </div>

                        {/* Roles Summary */}
                        {itinerary.some(item => item.volunteerRoles.length > 0) && (
                          <div className="px-5 pb-5">
                            <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Users className="w-5 h-5 text-gold-400" />
                                <span className="text-sm font-semibold text-white/70">Volunteer Roles</span>
                              </div>
                              <div className="space-y-2">
                                {itinerary.flatMap(item =>
                                  item.volunteerRoles.map(role => (
                                    <div key={role.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                      <span className="font-medium text-foreground">{role.roleLabel || "Untitled"}</span>
                                      <span className="text-sm text-white/40 bg-white/10 px-2 py-1 rounded-lg">
                                        {role.slotsBrother + role.slotsSister + (role.slotsFlexible || 0)} needed
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                              {/* Total */}
                              <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
                                <span className="text-sm font-semibold text-white/50">Total volunteers</span>
                                <span className="text-lg font-bold text-gold-400">
                                  {itinerary.reduce((total, item) =>
                                    total + item.volunteerRoles.reduce((roleTotal, role) =>
                                      roleTotal + role.slotsBrother + role.slotsSister + (role.slotsFlexible || 0), 0
                                    ), 0
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* No roles warning */}
                        {!itinerary.some(item => item.volunteerRoles.length > 0) && (
                          <div className="px-5 pb-5">
                            <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4 flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-300">No volunteer roles defined</p>
                                <p className="text-xs text-yellow-600 mt-1">Go back to add roles for your event</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop: Original Event Summary */}
                    <Card className="hidden md:block mb-6 bg-white/5 border-white/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center space-x-2 text-foreground">
                          <Calendar className="w-5 h-5" />
                          <span>Event Summary</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-foreground">{eventData.title}</h4>
                            <div className="text-sm text-white/50 space-y-2 mt-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-white/70" />
                                <span>{dateFromYMDLocal(eventData.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-white/70" />
                                <span>
                                  {formatTime24To12(eventData.startTime)} - {formatTime24To12(eventData.endTime)}
                                  {eventData.startTime && eventData.endTime && isOvernightEvent(eventData.startTime, eventData.endTime) && (
                                    <span className="ml-2 text-gold-400/70 text-xs">(overnight)</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-white/70" />
                                <span>{eventData.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h5 className="font-medium text-foreground">Volunteer Roles</h5>
                            {itinerary.some(item => item.volunteerRoles.length > 0) ? (
                              <div className="space-y-2">
                                {itinerary.map(item =>
                                  item.volunteerRoles.map(role => (
                                    <div key={role.id} className="text-sm text-white/50 flex items-center gap-2">
                                      <span>
                                        {formatTime24To12(role.shiftStartTime)} - {formatTime24To12(role.shiftEndTime)} {role.roleLabel}: {role.slotsBrother + role.slotsSister + (role.slotsFlexible || 0)} slots
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-white/40">No volunteer roles defined yet</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* SMS Settings - Simplified for mobile */}
                    <SectionCard
                      title="SMS Reminders"
                      collapsible={true}
                      defaultExpanded={eventData.smsEnabled}
                      className="md:bg-white/5 md:border md:border-white/10 md:shadow-none"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base md:text-sm font-medium text-white/70 md:text-white/70">Enable SMS Reminders</Label>
                            <p className="text-sm text-white/40 md:text-white/40 mt-0.5">Automatic reminders for volunteers</p>
                          </div>
                          <Switch
                            checked={eventData.smsEnabled}
                            onCheckedChange={(checked) => setEventData(prev => ({ ...prev, smsEnabled: checked }))}
                            disabled={eventId && !hasEditPermission}
                          />
                        </div>

                        {eventData.smsEnabled && (
                          <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4 border-t border-white/10 md:border-white/5">
                            <div className="space-y-2">
                              <Label className="text-sm text-white/50 md:text-white/70 font-medium">Day Before</Label>
                              <Input
                                type="time"
                                value={eventData.dayBeforeTime}
                                onChange={(e) => setEventData(prev => ({ ...prev, dayBeforeTime: e.target.value }))}
                                className="h-12 md:h-10 border-white/10 md:border-white/10 focus-visible:ring-gold-400 md:focus-visible:ring-gold-400 rounded-xl md:rounded-lg"
                                disabled={eventId && !hasEditPermission}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm text-white/50 md:text-white/70 font-medium">Day Of</Label>
                              <Input
                                type="time"
                                value={eventData.dayOfTime}
                                onChange={(e) => setEventData(prev => ({ ...prev, dayOfTime: e.target.value }))}
                                className="h-12 md:h-10 border-white/10 md:border-white/10 focus-visible:ring-gold-400 md:focus-visible:ring-gold-400 rounded-xl md:rounded-lg"
                                disabled={eventId && !hasEditPermission}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </SectionCard>

                    {/* Save as Template - Collapsible on mobile */}
                    <SectionCard
                      title="Save as Template"
                      collapsible={true}
                      defaultExpanded={false}
                      className="md:bg-white/5 md:border md:border-white/10 md:shadow-none"
                    >
                      <div className="space-y-4">
                        <p className="text-sm text-white/50 md:text-white/50">
                          Save this event setup as a template for future events.
                        </p>
                        <SaveAsTemplateDialog
                          eventData={eventData}
                          itinerary={itinerary}
                          additionalDetails={additionalDetails}
                          preEventTasks={preEventTasks}
                          disabled={eventId && !hasEditPermission}
                          sourceTemplateId={location.state?.templateId}
                          sourceTemplateName={location.state?.templateId ? location.state?.templateName : undefined}
                        />
                      </div>
                    </SectionCard>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Hidden on mobile, visible on lg screens */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Live Preview</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className="h-8 w-8 p-0"
                      >
                        {showLivePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {showLivePreview && (
                      <div className="space-y-4">
                        {/* Event Title */}
                        {eventData.title && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-white/70">Event Title</h4>
                            <p className="text-sm text-foreground bg-background p-3 rounded-lg border">
                              {eventData.title}
                            </p>
                          </div>
                        )}

                        {/* Date & Time */}
                        {(eventData.date || eventData.startTime || eventData.endTime) && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-white/70">Date & Time</h4>
                            <div className="text-sm text-foreground bg-background p-3 rounded-lg border space-y-1">
                              {eventData.date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-white/40" />
                                  <span>{dateFromYMDLocal(eventData.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}</span>
                                </div>
                              )}
                              {(eventData.startTime || eventData.endTime) && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-white/40" />
                                  <span>
                                    {formatTime24To12(eventData.startTime) || '--:--'} - {formatTime24To12(eventData.endTime) || '--:--'}
                                    {eventData.startTime && eventData.endTime && isOvernightEvent(eventData.startTime, eventData.endTime) && (
                                      <span className="ml-2 text-gold-400/70 text-xs">(overnight)</span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Location */}
                        {eventData.location && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-white/70">Location</h4>
                            <div className="text-sm text-foreground bg-background p-3 rounded-lg border flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-white/40" />
                              <span>{eventData.location}</span>
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {eventData.description && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-white/70">Description</h4>
                            <div className="text-sm text-foreground bg-background p-3 rounded-lg border">
                              {eventData.description}
                            </div>
                          </div>
                        )}

                        {/* Empty State */}
                        {!eventData.title && !eventData.date && !eventData.startTime && !eventData.endTime && !eventData.location && !eventData.description && (
                          <div className="text-center py-8 text-white/40">
                            <Calendar className="w-8 h-8 mx-auto mb-2 text-white/20" />
                            <p className="text-sm">Start filling out your event details to see a live preview here.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Itinerary Preview</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className="h-8 w-8 p-0"
                      >
                        {showLivePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {showLivePreview && (
                      <div className="space-y-4">
                        {itinerary.length > 0 ? (
                          <div className="space-y-3">
                            {itinerary.map((item, index) => (
                              <div key={index} className="bg-background p-3 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-white/70">{formatTime24To12(item.time)}</span>
                                  <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                                    {item.volunteerRoles.length} roles
                                  </span>
                                </div>
                                <h5 className="font-medium text-foreground text-sm mb-1">{item.title}</h5>
                                {item.description && (
                                  <p className="text-xs text-white/50 mb-2">{item.description}</p>
                                )}
                                {item.volunteerRoles.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-white/70">Volunteer Roles:</p>
                                    {item.volunteerRoles.map((role, roleIndex) => (
                                      <div key={roleIndex} className="text-xs text-white/50 bg-white/5 p-2 rounded border">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{role.roleLabel}</span>
                                          <span className="text-white/40">
                                            {role.slotsBrother + role.slotsSister + (role.slotsFlexible || 0)} slots
                                          </span>
                                        </div>
                                        {role.notes && (
                                          <p className="text-white/40 mt-1">{role.notes}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-white/40">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-white/20" />
                            <p className="text-sm">No itinerary items yet. Start planning your event timeline.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Publish Summary</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className="h-8 w-8 p-0"
                      >
                        {showLivePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {showLivePreview && (
                      <div className="space-y-4">
                        {/* Event Overview */}
                        <div className="bg-background p-3 rounded-lg border">
                          <h4 className="font-medium text-white/70 text-sm mb-2">Event Overview</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-white/50">Status:</span>
                              <span className={`font-medium ${eventData.status === 'published' ? 'text-emerald-400' : 'text-yellow-600'}`}>
                                {eventData.status === 'published' ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Visibility:</span>
                              <span className={`font-medium ${eventData.isPublic ? 'text-emerald-400' : 'text-orange-600'}`}>
                                {eventData.isPublic ? 'Public' : 'Private'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">SMS Reminders:</span>
                              <span className="font-medium">{eventData.smsEnabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            {eventData.smsEnabled && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-white/50">Day Before:</span>
                                  <span className="font-medium">{formatTime24To12(eventData.dayBeforeTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/50">Day Of:</span>
                                  <span className="font-medium">{formatTime24To12(eventData.dayOfTime)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quick Visibility Toggle */}
                        <div className="bg-background p-3 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white/70 text-sm">Event Visibility</h4>
                              <p className="text-xs text-white/40">
                                {eventData.isPublic
                                  ? "Event is visible to the public"
                                  : "Event is private (admin only)"
                                }
                              </p>
                            </div>
                            <Switch
                              checked={eventData.isPublic}
                              onCheckedChange={(checked) => setEventData(prev => ({ ...prev, isPublic: checked }))}
                              disabled={eventId && !hasEditPermission}
                            />
                          </div>
                        </div>

                        {/* Itinerary Summary */}
                        <div className="bg-background p-3 rounded-lg border">
                          <h4 className="font-medium text-white/70 text-sm mb-2">Itinerary Summary</h4>
                          <div className="text-xs text-white/50">
                            <div className="flex justify-between mb-1">
                              <span>Total Items:</span>
                              <span className="font-medium">{itinerary.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Roles:</span>
                              <span className="font-medium">
                                {itinerary.reduce((total, item) => total + item.volunteerRoles.length, 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Publish Checklist */}
                        <div className="bg-background p-3 rounded-lg border">
                          <h4 className="font-medium text-white/70 text-sm mb-2">Publish Checklist</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${eventData.title ? 'bg-green-500' : 'bg-white/20'}`}></div>
                              <span className={eventData.title ? 'text-foreground' : 'text-white/40'}>Event title</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${eventData.date ? 'bg-green-500' : 'bg-white/20'}`}></div>
                              <span className={eventData.date ? 'text-foreground' : 'text-white/40'}>Date & time</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${eventData.location ? 'bg-green-500' : 'bg-white/20'}`}></div>
                              <span className={eventData.location ? 'text-foreground' : 'text-white/40'}>Location</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${eventData.description ? 'bg-green-500' : 'bg-white/20'}`}></div>
                              <span className={eventData.description ? 'text-foreground' : 'text-white/40'}>Description</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep !== 1 && currentStep !== 2 && currentStep !== 5 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Itinerary Preview</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className="h-8 w-8 p-0"
                      >
                        {showLivePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {showLivePreview && (
                      <div className="space-y-4">
                        {itinerary.length > 0 ? (
                          <div className="space-y-3">
                            {itinerary.map((item, index) => (
                              <div key={index} className="bg-background p-3 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-white/70">{formatTime24To12(item.time)}</span>
                                  <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                                    {item.volunteerRoles.length} roles
                                  </span>
                                </div>
                                <h5 className="font-medium text-foreground text-sm mb-1">{item.title}</h5>
                                {item.description && (
                                  <p className="text-xs text-white/50 mb-2">{item.description}</p>
                                )}
                                {item.volunteerRoles.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-white/70">Volunteer Roles:</p>
                                    {item.volunteerRoles.map((role, roleIndex) => (
                                      <div key={roleIndex} className="text-xs text-white/50 bg-white/5 p-2 rounded border">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{role.roleLabel}</span>
                                          <span className="text-white/40">
                                            {formatTime24To12(role.shiftStartTime)} - {formatTime24To12(role.shiftEndTime)} {role.slotsBrother + role.slotsSister + (role.slotsFlexible || 0)} slots
                                          </span>
                                        </div>
                                        {role.notes && (
                                          <p className="text-white/40 mt-1">{role.notes}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-white/40">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-white/20" />
                            <p className="text-sm">No itinerary items yet. Start planning your event timeline.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main >

      {/* Sticky Bottom Action Bar */}
      < StickyBottomBar
        statusText={
          isAutoSaving ? "Saving..." :
            isSaving ? "Publishing..." :
              hasUnsavedChanges ? "Unsaved changes" :
                lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` :
                  undefined
        }
        primaryAction={{
          label: currentStep === steps.length
            ? (eventId ? "Update Event" : "Publish Event")
            : "Continue",
          onClick: currentStep === steps.length && canProceed()
            ? () => saveEvent('published')
            : nextStep,
          disabled: (currentStep === steps.length && (!canProceed() || (eventId && !hasEditPermission))) ||
            (currentStep !== steps.length && currentStep === steps.length) ||
            isSaving,
          loading: isSaving
        }}
        secondaryAction={currentStep > 1 ? {
          label: "Previous",
          onClick: prevStep
        } : undefined}
      >
        {/* Inline actions */}
        < div className="flex items-center gap-2" >
          {eventId && hasEditPermission && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              className="h-9 w-9 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {
            !eventId && canProceed() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveEvent('draft')}
                className="h-9 px-3 text-white/50 hover:bg-white/10"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save Draft
              </Button>
            )
          }
        </div >
      </StickyBottomBar >

      {/* Spacer for sticky bottom bar - larger on mobile */}
      < div className="h-32 md:h-20" />

      {/* Add Contact Dialog */}
      < Dialog open={showAddContact} onOpenChange={setShowAddContact} >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Add someone who will be a point of contact for volunteer roles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactFirstName">First Name</Label>
              <Input
                id="contactFirstName"
                value={newContactData.firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactLastName">Last Name</Label>
              <Input
                id="contactLastName"
                value={newContactData.lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="Last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <PhoneInput
                id="contactPhone"
                value={newContactData.phone}
                onChange={(val) => handlePhoneChange(val)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactGender">Gender *</Label>
              <CustomSelect
                options={[
                  { value: '', label: 'Select gender' },
                  { value: 'brother', label: 'Brother' },
                  { value: 'sister', label: 'Sister' }
                ]}
                value={newContactData.gender}
                onChange={handleGenderChange}
                placeholder="Select gender"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddContact(false)}>
              Cancel
            </Button>
            <Button onClick={addNewContact}>
              Add Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog >

      {/* Delete Confirmation Dialog */}
      < Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog >

      {/* Unsaved Changes Dialog */}
      < Dialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save your work as a draft before leaving?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => {
              setShowUnsavedChangesDialog(false);
              if (pendingNavigation) {
                if (pendingNavigation.startsWith('step-')) {
                  const stepNumber = parseInt(pendingNavigation.replace('step-', ''));
                  setCurrentStep(stepNumber);
                } else {
                  navigate(pendingNavigation);
                }
                setPendingNavigation(null);
              }
            }}>
              Leave Without Saving
            </Button>
            <Button
              onClick={async () => {
                try {
                  await saveEvent('draft');
                  toast({
                    title: "Draft Saved",
                    description: "Your progress has been saved as a draft.",
                  });
                  setShowUnsavedChangesDialog(false);
                  if (pendingNavigation) {
                    if (pendingNavigation.startsWith('step-')) {
                      const stepNumber = parseInt(pendingNavigation.replace('step-', ''));
                      setCurrentStep(stepNumber);
                    } else {
                      navigate(pendingNavigation);
                    }
                    setPendingNavigation(null);
                  }
                } catch (error) {
                  toast({
                    title: "Save Failed",
                    description: "Failed to save draft. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-gold-400 hover:bg-gold-300 text-white"
            >
              Save as Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog >
    </div >
  );
};

export default EventCreation;