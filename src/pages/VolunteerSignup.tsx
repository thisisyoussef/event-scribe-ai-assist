
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Copy, 
  Share2, 
  MapPin, 
  Users, 
  Search, 
  ChevronDown,
  ChevronUp,
  Star,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  List,
  Grid3X3
} from "lucide-react";
import { VolunteerRole, Volunteer, Event } from "@/types/database";
import { useVolunteerSignup } from "@/hooks/useVolunteerSignup";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { displayTimeInMichigan, formatTimeInMichigan, formatDateInMichigan, formatTime24To12 } from "@/utils/timezoneUtils";
import SignupModal from "@/components/volunteer/SignupModal";
import LoadingState from "@/components/volunteer/LoadingState";
import EventNotFound from "@/components/volunteer/EventNotFound";
import SignupPageMeta from "@/components/volunteer/SignupPageMeta";
import AddToCalendar from "@/components/volunteer/AddToCalendar";
import { supabase } from "@/integrations/supabase/client";
import { CustomSelect } from "@/components/ui/custom-select";
import { useVolunteerDeletion } from "@/hooks/useVolunteerDeletion";
import { trackPageView, trackHumanClick, parseUTMParams } from "@/utils/analyticsUtils";

const VolunteerSignup = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const {
    event,
    loading,
    eventSlug,
    isModalOpen,
    setIsModalOpen,
    selectedRole,
    isSubmitting,
    getVolunteersForRole,
    getRemainingSlots,
    getExistingSignups,
    openSignupModal,
    handleSignupSubmit,
    updateLocalVolunteers
  } = useVolunteerSignup();

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("time");
  const [timeFilter, setTimeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [isMobileMenuExpanded, setIsMobileMenuExpanded] = useState(false);

  // Load saved view preference from localStorage on component mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('volunteer-signup-view-mode');
    if (savedViewMode === 'list' || savedViewMode === 'cards') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Track analytics when event loads
  useEffect(() => {
    if (event?.id) {
      // Track page view
      trackPageView(event.id);
      
      // Check if this is a QR scan (utm_source=qr_code)
      const utmParams = parseUTMParams(window.location.href);
      if (utmParams.source === 'qr_code') {
        // Track QR scan
        import('@/utils/analyticsUtils').then(({ trackQRScan }) => {
          trackQRScan(event.id);
        });
      }
    }
  }, [event?.id]);

  // Save view preference to localStorage whenever it changes
  const handleViewModeChange = (mode: "list" | "cards") => {
    setViewMode(mode);
    localStorage.setItem('volunteer-signup-view-mode', mode);
  };

  // Track human click when user interacts with signup
  const handleSignupClick = (role: VolunteerRole) => {
    if (event?.id) {
      trackHumanClick(event.id);
    }
    openSignupModal(role);
  };
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    volunteerId: string | null;
    volunteerName: string;
    roleName: string;
    phoneVerification?: string;
    volunteerPhone?: string;
  }>({ isOpen: false, volunteerId: null, volunteerName: "", roleName: "" });
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
    volunteerId: string | null;
    volunteerName: string;
    roleName: string;
    volunteerPhone: string;
  }>({ isOpen: false, volunteerId: null, volunteerName: "", roleName: "", volunteerPhone: "" });
  const [phoneVerification, setPhoneVerification] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAdminOption, setShowAdminOption] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const { deleteVolunteer } = useVolunteerDeletion();
  const [adminDeletionPassword, setAdminDeletionPassword] = useState<string | null>(null);

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

  // This function only updates the local state - the actual deletion is handled by VolunteerTable
  const handleVolunteerDeleted = (volunteerId: string) => {
    console.log(`[SIGNUP] Updating local state to remove volunteer ${volunteerId}`);
    updateLocalVolunteers(volunteerId);
  };

  const handleDeleteVolunteer = (volunteerId: string, volunteerName: string, roleName: string) => {
    // Find the volunteer to get their phone number
    const volunteer = event?.volunteer_roles?.flatMap(role => 
      getVolunteersForRole(role.id)
    ).find(v => v.id === volunteerId);
    
    if (volunteer) {
      setPasswordDialog({
        isOpen: true,
        volunteerId,
        volunteerName,
        roleName,
        volunteerPhone: volunteer.phone
      });
    }
  };

  const handlePasswordSubmit = async () => {
    const entered = normalizePhoneE164(phoneVerification);
    const target = normalizePhoneE164(passwordDialog.volunteerPhone || "");
    if (entered && entered === target) {
      console.log('Phone verification successful, storing values:', {
        phoneVerification: entered,
        volunteerPhone: target
      });
      if (passwordDialog.volunteerId) {
        setDeleteDialog({
          isOpen: true,
          volunteerId: passwordDialog.volunteerId,
          volunteerName: passwordDialog.volunteerName,
          roleName: passwordDialog.roleName,
          phoneVerification: entered,
          volunteerPhone: target
        });
      }
      setPasswordDialog({ isOpen: false, volunteerId: null, volunteerName: "", roleName: "", volunteerPhone: "" });
      setPhoneVerification("");
    } else {
      toast({
        title: "Incorrect Phone Number",
        description: "Please enter the correct phone number to confirm deletion.",
        variant: "destructive",
      });
    }
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPassword === "admin123") {
      setPasswordDialog({ isOpen: false, volunteerId: null, volunteerName: "", roleName: "", volunteerPhone: "" });
      setPhoneVerification("");
      // Store the admin password for the upcoming confirmed deletion
      setAdminDeletionPassword(adminPassword);
      setAdminPassword("");
      setShowAdminOption(false);
      if (passwordDialog.volunteerId) {
        setDeleteDialog({
          isOpen: true,
          volunteerId: passwordDialog.volunteerId,
          volunteerName: passwordDialog.volunteerName,
          roleName: passwordDialog.roleName,
          phoneVerification: phoneVerification,
          volunteerPhone: passwordDialog.volunteerPhone
        });
      }
    } else {
      toast({
        title: "Incorrect Admin Password",
        description: "Please enter the correct admin password.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteVolunteer = async () => {
    if (deleteDialog.volunteerId) {
      setIsDeleting(true);
      try {
        let success = false;
        
        // If admin override was used, perform secure deletion via Edge Function
        if (adminDeletionPassword) {
          console.log('Admin deletion path:', {
            volunteerId: deleteDialog.volunteerId,
            volunteerName: deleteDialog.volunteerName,
            adminPassword: adminDeletionPassword
          });
          success = await deleteVolunteer(
            deleteDialog.volunteerId,
            deleteDialog.volunteerName,
            adminDeletionPassword
          );
        } else {
          // Phone verification path: use secure deletion via Edge Function
          console.log('Phone verification deletion path:', {
            volunteerId: deleteDialog.volunteerId,
            volunteerName: deleteDialog.volunteerName,
            phoneVerification: deleteDialog.phoneVerification,
            volunteerPhone: deleteDialog.volunteerPhone
          });
          success = await deleteVolunteer(
            deleteDialog.volunteerId,
            deleteDialog.volunteerName,
            undefined, // no admin password
            deleteDialog.phoneVerification, // phone verification
            deleteDialog.volunteerPhone // volunteer's phone number
          );
        }
        
        if (!success) {
          throw new Error("Deletion failed");
        }

        // Update local state after successful backend deletion
        handleVolunteerDeleted(deleteDialog.volunteerId);
        
        toast({
          title: "Volunteer Removed",
          description: `${deleteDialog.volunteerName} has been removed from ${deleteDialog.roleName}.`,
        });
      } catch (error) {
        console.error('Error deleting volunteer:', error);
        toast({
          title: "Error",
          description: "Failed to remove volunteer. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
        setAdminDeletionPassword(null);
        setDeleteDialog({ isOpen: false, volunteerId: null, volunteerName: "", roleName: "", phoneVerification: undefined, volunteerPhone: undefined });
      }
    }
  };

  const sortedAndFilteredRoles = useMemo(() => {
    let roles = [...(event?.volunteer_roles || [])];
    
    // Apply search filter
    if (searchQuery.trim()) {
      roles = roles.filter(role => 
        role.role_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply time filter (relative to event times)
    if (timeFilter !== "all" && event) {
      // Get event start and end times
      const eventStart = new Date(event.start_datetime);
      const eventEnd = new Date(event.end_datetime);
      
      // Convert to minutes for easier comparison
      const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
      
      roles = roles.filter(role => {
        const [startHour, startMin] = (role.shift_start || '00:00').split(':').map(Number);
        const [endHour, endMin] = (role.shift_end || '23:59').split(':').map(Number);
        const roleStartTime = startHour * 60 + startMin;
        const roleEndTime = endHour * 60 + endMin;
        
        switch (timeFilter) {
          case "before":
            // Role ends before event starts
            return roleEndTime < eventStartMinutes;
          case "during":
            // Role overlaps with event time (starts before event ends and ends after event starts)
            return roleStartTime < eventEndMinutes && roleEndTime > eventStartMinutes;
          case "after":
            // Role starts after event ends
            return roleStartTime > eventEndMinutes;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    roles.sort((a, b) => {
      const remainingA = getRemainingSlots(a);
      const remainingB = getRemainingSlots(b);
      
      switch (sortBy) {
        case "spots":
          if (remainingA !== remainingB) return remainingB - remainingA;
          break;
        case "time":
          return (a.shift_start || '').localeCompare(b.shift_start || '');
        case "newest":
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        default:
          break;
      }
      
      // Stable tiebreaker
      return a.id.localeCompare(b.id);
    });
    
    return roles;
  }, [event, searchQuery, sortBy, timeFilter, getRemainingSlots]);

  // Function to create a readable slug from event title
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

  const copySignupLink = () => {
    // Generate the readable link using event title
    const readableSlug = createReadableEventSlug(event.title, event.id);
    const readableLink = `${window.location.origin}/${readableSlug}`;
    
    navigator.clipboard.writeText(readableLink).then(() => {
      toast({
        title: "Link Copied! 📋",
        description: `Copied link for: ${event.title}`,
      });
    });
  };

  const shareSignupLink = async () => {
    // Generate the readable link using event title
    const readableSlug = createReadableEventSlug(event.title, event.id);
    const readableLink = `${window.location.origin}/${readableSlug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Volunteer Signup',
          text: 'Sign up to volunteer for this event!',
          url: readableLink,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      copySignupLink();
    }
  };

  const toggleRoleExpansion = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("time");
    setTimeFilter("all");
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!event) {
    return <EventNotFound eventId={eventSlug} />;
  }

  const totalRoles = event.volunteer_roles?.length || 0;
  const totalVolunteers = event.volunteer_roles?.reduce((sum, role) => {
    const volunteers = getVolunteersForRole(role.id);
    return sum + volunteers.length;
  }, 0) || 0;
  const totalSlots = event.volunteer_roles?.reduce((sum, role) => {
    return sum + (role.slots_brother || 0) + (role.slots_sister || 0) + (role.slots_flexible || 0);
  }, 0) || 0;

  return (
    <>
      <SignupPageMeta event={event} />
      <div className="min-h-screen bg-gray-50">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Button> */}
              <div></div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
              {/* Event Header */}
              <div className="flex items-start gap-3">
                {/* Event Avatar */}
                <div className="w-10 h-10 bg-[#5c5b2f] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                
                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  {/* Event Title */}
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">
                      {event.title}
                    </h1>
                    {event.is_public === false && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        Private
                      </Badge>
                    )}
                  </div>
                  
                  {/* Event Meta */}
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        {formatDateInMichigan(event.start_datetime)} at {displayTimeInMichigan(event.start_datetime)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-medium leading-tight">{event.location}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Menu Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuExpanded(!isMobileMenuExpanded)}
                  className="text-gray-400 hover:text-gray-600 p-2 h-8 w-8 flex-shrink-0"
                >
                  {isMobileMenuExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {/* Event Stats - Mobile */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#5c5b2f]">{totalRoles}</div>
                    <div className="text-sm text-gray-600 font-medium">Roles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#5c5b2f]">{totalVolunteers}</div>
                    <div className="text-sm text-gray-600 font-medium">Volunteers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#5c5b2f]">{totalSlots - totalVolunteers}</div>
                    <div className="text-sm text-gray-600 font-medium">Open Spots</div>
                  </div>
                </div>
              </div>

              {/* Collapsible Mobile Menu */}
              {isMobileMenuExpanded && (
                <div className="space-y-4 bg-gray-50 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Action Buttons - Mobile */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copySignupLink}
                      className="flex-1 border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20 text-gray-600 hover:text-gray-900 hover:bg-gray-50 h-10"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={shareSignupLink}
                      className="flex-1 border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20 text-gray-600 hover:text-gray-900 hover:bg-gray-50 h-10"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <AddToCalendar event={event} role={null} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-10 px-3" />
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search roles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20 h-11 text-left placeholder:text-[#5c5b2f]/70"
                      autoComplete="off"
                    />
                  </div>

                  {/* Sort and View Toggle */}
                  <div className="flex items-center gap-3">
                    {/* Sort Filter */}
                    <div className="flex items-center gap-2 flex-1">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</Label>
                      <div className="flex-1">
                        <CustomSelect
                          options={[
                            { value: "time", label: "Time" },
                            { value: "spots", label: "Spots Left" },
                            { value: "newest", label: "Newest" }
                          ]}
                          value={sortBy}
                          onChange={(value) => setSortBy(value)}
                          placeholder="Sort by"
                        />
                      </div>
                    </div>
                    
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" title="View preference is saved in your browser">
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleViewModeChange("list")}
                        className={`h-8 px-3 ${
                          viewMode === "list" 
                            ? "bg-[#5c5b2f] text-white shadow-sm" 
                            : "text-gray-600 hover:text-gray-900 hover:bg-white"
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "cards" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleViewModeChange("cards")}
                        className={`h-8 px-3 ${
                          viewMode === "cards" 
                            ? "bg-[#5c5b2f] text-white shadow-sm" 
                            : "text-gray-600 hover:text-gray-900 hover:bg-white"
                        }`}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex items-start justify-between">
              {/* Event Header - Left Side */}
              <div className="max-w-2xl">
                <div className="flex items-start gap-4">
                  {/* Event Avatar */}
                  <div className="w-12 h-12 bg-[#5c5b2f] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Event Details */}
                  <div className="flex-1">
                    {/* Event Title */}
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                        {event.title}
                      </h1>
                      {event.is_public === false && (
                        <Badge variant="outline" className="text-sm bg-amber-50 text-amber-700 border-amber-200">
                          Private
                        </Badge>
                      )}
                    </div>
                    
                    {/* Event Meta */}
                    <div className="flex flex-col sm:flex-row items-start gap-2 mb-3 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm md:text-base font-medium">
                          {formatDateInMichigan(event.start_datetime)} at {displayTimeInMichigan(event.start_datetime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm md:text-base font-medium">{event.location}</span>
                      </div>
                    </div>
                    
                    {/* Event Stats */}
                    <div className="grid grid-cols-3 gap-4 max-w-sm">
                      <div className="text-left">
                        <div className="text-xl font-bold text-[#5c5b2f]">{totalRoles}</div>
                        <div className="text-xs text-gray-600">Roles</div>
                      </div>
                      <div className="text-left">
                        <div className="text-xl font-bold text-[#5c5b2f]">{totalVolunteers}</div>
                        <div className="text-xs text-gray-600">Volunteers</div>
                      </div>
                      <div className="text-left">
                        <div className="text-xl font-bold text-[#5c5b2f]">{totalSlots - totalVolunteers}</div>
                        <div className="text-xs text-gray-600">Open Spots</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Right Side */}
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySignupLink}
                    className="border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareSignupLink}
                    className="border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <AddToCalendar event={event} role={null} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100" />
                </div>
                
                {/* Search */}
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20 h-10 text-left placeholder:text-[#5c5b2f]/70"
                    autoComplete="off"
                  />
                </div>
                
                {/* Sort Filter and View Toggle */}
                <div className="flex items-center gap-3">
                  
                   {/* Sort Filter */}
                   <div className="flex items-center gap-2">
                     <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</Label>
                     <div className="w-44">
                       <CustomSelect
                         options={[
                           { value: "time", label: "Time" },
                           { value: "spots", label: "Spots Left" },
                           { value: "newest", label: "Newest" }
                         ]}
                         value={sortBy}
                         onChange={(value) => setSortBy(value)}
                         placeholder="Sort by"
                       />
                     </div>
                   </div>
                  
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" title="View preference is saved in your browser">
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleViewModeChange("list")}
                      className={`h-8 px-3 ${
                        viewMode === "list" 
                          ? "bg-[#5c5b2f] text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-white"
                      }`}
                    >
                      <List className="w-4 h-4 mr-1" />
                      <span className="hidden xs:inline text-xs">List</span>
                    </Button>
                    <Button
                      variant={viewMode === "cards" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleViewModeChange("cards")}
                      className={`h-8 px-3 ${
                        viewMode === "cards" 
                          ? "bg-[#5c5b2f] text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-white"
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4 mr-1" />
                      <span className="hidden xs:inline text-xs">Cards</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 md:py-8">

          {/* Role List - Conditional Rendering */}
          {viewMode === "list" ? (
            /* Compact List View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Time</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-2">Point of Contact</div>
              <div className="col-span-2">Spots</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Action</div>
            </div>

            {/* Role Rows */}
            <div className="divide-y divide-gray-100">
              {sortedAndFilteredRoles.map((role, index) => {
                const volunteers = getVolunteersForRole(role.id);
                const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0) + (role.slots_flexible || 0);
                const remainingSlots = getRemainingSlots(role);
                const isExpanded = expandedRoles.has(role.id);
                const brothersSignedUp = volunteers.filter(v => v.gender === 'brother').length;
                const sistersSignedUp = volunteers.filter(v => v.gender === 'sister').length;

                return (
                  <div key={role.id} className={`group hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    {/* Main Row - Desktop */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                      {/* Time Column */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatTime24To12(role.shift_start)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTime24To12(role.shift_end)}
                        </div>
                      </div>

                      {/* Role Column */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm mb-1">
                              {role.role_label}
                            </h3>
                            {role.notes && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {role.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRoleExpansion(role.id)}
                            className="text-gray-400 hover:text-gray-600 p-1 h-6 w-6 rounded-full border"
                            style={{ borderColor: 'rgb(89, 89, 46)' }}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Point of Contact Column */}
                      <div className="col-span-2">
                        {role.poc_contacts && role.poc_contacts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {role.poc_contacts.map((poc, index) => (
                              <Badge 
                                key={poc.id}
                                variant="outline" 
                                className="text-xs bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors px-2 py-1"
                                onClick={() => {
                                  if (poc.phone) {
                                    navigator.clipboard.writeText(poc.phone);
                                    toast({
                                      title: "Phone number copied!",
                                      description: `${poc.name}'s phone number copied to clipboard`,
                                    });
                                  }
                                }}
                                title={poc.phone ? `Click to copy ${poc.name}'s phone number` : `${poc.name} - No phone number`}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                {poc.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No POC assigned</span>
                        )}
                      </div>

                      {/* Spots Column */}
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-900">
                          {totalSlots - remainingSlots} / {totalSlots}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-[#5c5b2f] to-[#6b6a3a] h-1.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${totalSlots > 0 ? ((totalSlots - remainingSlots) / totalSlots) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Column */}
                      <div className="col-span-2">
                        <Badge 
                          variant={remainingSlots > 0 ? "default" : "secondary"}
                          className={`text-xs font-semibold px-2.5 py-1 ${
                            remainingSlots > 0 
                              ? "bg-green-100 text-green-800 border-green-200 shadow-sm" 
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          }`}
                        >
                          {remainingSlots > 0 ? `${remainingSlots} spots left` : "Full"}
                        </Badge>
                        {/* Gender breakdown badges */}
                        <div className="flex gap-1 mt-2">
                          {(() => {
                            const remainingBrothers = Math.max(0, (role.slots_brother || 0) - brothersSignedUp);
                            const remainingSisters = Math.max(0, (role.slots_sister || 0) - sistersSignedUp);
                            const totalSpecificSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
                            const totalSpecificFilled = brothersSignedUp + sistersSignedUp;
                            const flexibleSlotsUsed = Math.max(0, totalSpecificFilled - totalSpecificSlots);
                            const remainingFlexible = Math.max(0, (role.slots_flexible || 0) - flexibleSlotsUsed);
                            
                            return (
                              <>
                                {remainingBrothers > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0.5 h-5"
                                  >
                                    <span className="hidden xl:inline">{remainingBrothers} Brother{remainingBrothers !== 1 ? 's' : ''}</span>
                                    <span className="xl:hidden">{remainingBrothers}B</span>
                                  </Badge>
                                )}
                                {remainingSisters > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-pink-50 text-pink-700 border-pink-200 px-1.5 py-0.5 h-5"
                                  >
                                    <span className="hidden xl:inline">{remainingSisters} Sister{remainingSisters !== 1 ? 's' : ''}</span>
                                    <span className="xl:hidden">{remainingSisters}S</span>
                                  </Badge>
                                )}
                                {remainingFlexible > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-teal-50 text-teal-700 border-teal-200 px-1.5 py-0.5 h-5"
                                  >
                                    <span className="hidden xl:inline">{remainingFlexible} Flexible</span>
                                    <span className="xl:hidden">{remainingFlexible}F</span>
                                  </Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Action Column */}
                      <div className="col-span-1">
                        <Button
                          onClick={() => handleSignupClick(role)}
                          disabled={remainingSlots <= 0}
                          size="sm"
                          className={`w-full ${
                            remainingSlots > 0 
                              ? "bg-[#5c5b2f] hover:bg-[#4a4a28] text-white" 
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {remainingSlots > 0 ? "Sign Up" : "Full"}
                        </Button>
                      </div>
                    </div>

                    {/* Mobile Row */}
                    <div className="md:hidden p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-base mb-2">
                            {role.role_label}
                          </h3>
                          {/* POC Badges */}
                          {role.poc_contacts && role.poc_contacts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {role.poc_contacts.map((poc, index) => (
                                <Badge 
                                  key={poc.id}
                                  variant="outline" 
                                  className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors px-1.5 py-0.5"
                                  onClick={() => {
                                    if (poc.phone) {
                                      navigator.clipboard.writeText(poc.phone);
                                      toast({
                                        title: "Phone number copied!",
                                        description: `${poc.name}'s phone number copied to clipboard`,
                                      });
                                    }
                                  }}
                                  title={poc.phone ? `Click to copy ${poc.name}'s phone number` : `${poc.name} - No phone number`}
                                >
                                  <Users className="w-2.5 h-2.5 mr-0.5" />
                                  <span>Point of Contact: {poc.name}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">
                              {formatTime24To12(role.shift_start)} - {formatTime24To12(role.shift_end)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRoleExpansion(role.id)}
                          className="text-gray-400 hover:text-gray-600 p-2 h-8 w-8 rounded-full border"
                          style={{ borderColor: 'rgb(89, 89, 46)' }}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={remainingSlots > 0 ? "default" : "secondary"}
                            className={`text-sm font-semibold px-3 py-1 ${
                              remainingSlots > 0 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : "bg-gray-100 text-gray-800 border-gray-200"
                            }`}
                          >
                            {remainingSlots > 0 ? `${remainingSlots} spots left` : "Full"}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {totalSlots - remainingSlots} / {totalSlots} filled
                          </span>
                        </div>
                        <Button
                          onClick={() => handleSignupClick(role)}
                          disabled={remainingSlots <= 0}
                          size="sm"
                          className={`h-10 px-4 ${
                            remainingSlots > 0 
                              ? "bg-[#5c5b2f] hover:bg-[#4a4a28] text-white" 
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {remainingSlots > 0 ? "Sign Up" : "Full"}
                        </Button>
                      </div>

                      {/* Gender breakdown badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(() => {
                          const remainingBrothers = Math.max(0, (role.slots_brother || 0) - brothersSignedUp);
                          const remainingSisters = Math.max(0, (role.slots_sister || 0) - sistersSignedUp);
                          const totalSpecificSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
                          const totalSpecificFilled = brothersSignedUp + sistersSignedUp;
                          const flexibleSlotsUsed = Math.max(0, totalSpecificFilled - totalSpecificSlots);
                          const remainingFlexible = Math.max(0, (role.slots_flexible || 0) - flexibleSlotsUsed);
                          
                          return (
                            <>
                              {remainingBrothers > 0 && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0.5"
                                >
                                  {remainingBrothers} Brother{remainingBrothers !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {remainingSisters > 0 && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-pink-50 text-pink-700 border-pink-200 px-1.5 py-0.5"
                                >
                                  {remainingSisters} Sister{remainingSisters !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {remainingFlexible > 0 && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-teal-50 text-teal-700 border-teal-200 px-1.5 py-0.5"
                                >
                                  {remainingFlexible} Flexible
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4">
                          {/* Description */}
                          {role.notes && (
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm mb-2">Description</h4>
                              <p className="text-gray-600 text-sm">{role.notes}</p>
                            </div>
                          )}


                          {/* Current Volunteers */}
                          {volunteers.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm mb-2">Current Volunteers</h4>
                              <div className="space-y-2">
                                {volunteers.map((volunteer, index) => (
                                  <div
                                    key={volunteer.id}
                                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                      navigator.clipboard.writeText(volunteer.phone);
                                      toast({
                                        title: "Phone number copied!",
                                        description: `${volunteer.name}'s phone number copied to clipboard`,
                                      });
                                    }}
                                    title={`Click to copy ${volunteer.name}'s phone number`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-[#5c5b2f] rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {volunteer.name.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900 text-sm">
                                          {volunteer.name}
                                          <span className="text-xs text-gray-500 ml-2">• {volunteer.phone}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 capitalize">{volunteer.gender}</div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteVolunteer(volunteer.id, volunteer.name, role.role_label);
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                      title="Remove volunteer from this role"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          ) : (
            /* Card View */
            <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sortedAndFilteredRoles.map((role) => {
                const volunteers = getVolunteersForRole(role.id);
                const totalSlots = (role.slots_brother || 0) + (role.slots_sister || 0) + (role.slots_flexible || 0);
                const remainingSlots = getRemainingSlots(role);
                const isExpanded = expandedRoles.has(role.id);
                const progressPercentage = totalSlots > 0 ? ((totalSlots - remainingSlots) / totalSlots) * 100 : 0;

                return (
                  <Card key={role.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                    <CardHeader className="pb-4">
                      <div className="space-y-3">
                        {/* Role Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                              {role.role_label}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {formatTime24To12(role.shift_start)} - {formatTime24To12(role.shift_end)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRoleExpansion(role.id)}
                            className="text-gray-400 hover:text-gray-600 rounded-full border h-8 w-8 p-0 flex items-center justify-center"
                            style={{ borderColor: 'rgb(89, 89, 46)' }}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {totalSlots - remainingSlots} / {totalSlots} filled
                            </span>
                            <Badge 
                              variant={remainingSlots > 0 ? "default" : "secondary"}
                              className={`text-xs ${
                                remainingSlots > 0 
                                  ? "bg-green-100 text-green-800 border-green-200" 
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }`}
                            >
                              {remainingSlots > 0 ? `${remainingSlots} spots left` : "Full"}
                            </Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[#5c5b2f] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          
                          {/* Slots Breakdown */}
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                            {(() => {
                              const brothersSignedUp = volunteers.filter(v => v.gender === 'brother').length;
                              const sistersSignedUp = volunteers.filter(v => v.gender === 'sister').length;
                              
                              // Calculate remaining slots for each type
                              const remainingBrothers = Math.max(0, (role.slots_brother || 0) - brothersSignedUp);
                              const remainingSisters = Math.max(0, (role.slots_sister || 0) - sistersSignedUp);
                              
                              // For flexible slots, we need to consider how many volunteers can still fill them
                              // Flexible slots are available for volunteers who don't fit in the specific brother/sister slots
                              const totalSpecificSlots = (role.slots_brother || 0) + (role.slots_sister || 0);
                              const totalSpecificFilled = brothersSignedUp + sistersSignedUp;
                              const flexibleSlotsUsed = Math.max(0, totalSpecificFilled - totalSpecificSlots);
                              const remainingFlexible = Math.max(0, (role.slots_flexible || 0) - flexibleSlotsUsed);
                              
                              return (
                                <>
                                  {remainingBrothers > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      {remainingBrothers} Brother{remainingBrothers !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {remainingSisters > 0 && (
                                    <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                                      {remainingSisters} Sister{remainingSisters !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {remainingFlexible > 0 && (
                                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                                      {remainingFlexible} Brother or Sister
                                    </Badge>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Description - Always visible */}
                        {role.notes && (
                          <div className="mt-3">
                            <h4 className="font-medium text-gray-900 text-sm mb-2">Description</h4>
                            <p className="text-gray-600 text-sm">{role.notes}</p>
                          </div>
                        )}

                        {/* Meta Chips */}
                        <div className="flex flex-wrap gap-2">
                          {role.poc_contacts && role.poc_contacts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {role.poc_contacts.map((poc, index) => (
                                <Badge 
                                  key={poc.id}
                                  variant="outline" 
                                  className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors px-1.5 py-0.5"
                                  onClick={() => {
                                    if (poc.phone) {
                                      navigator.clipboard.writeText(poc.phone);
                                      toast({
                                        title: "Phone number copied!",
                                        description: `${poc.name}'s phone number copied to clipboard`,
                                      });
                                    }
                                  }}
                                  title={poc.phone ? `Click to copy ${poc.name}'s phone number` : `${poc.name} - No phone number`}
                                >
                                  <Users className="w-2.5 h-2.5 mr-0.5" />
                                  <span>Point of Contact: {poc.name}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <CardContent className="pt-0 border-t border-gray-100">
                        <div className="space-y-4">

                          {/* Current Volunteers */}
                          {volunteers.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm mb-2">Current Volunteers</h4>
                              <div className="space-y-2">
                                {volunteers.map((volunteer, index) => (
                                  <div
                                    key={volunteer.id}
                                    className="flex items-center justify-between bg-gray-100 rounded-lg p-3 cursor-pointer hover:bg-gray-200 transition-colors"
                                    onClick={() => {
                                      navigator.clipboard.writeText(volunteer.phone);
                                      toast({
                                        title: "Phone number copied!",
                                        description: `${volunteer.name}'s phone number copied to clipboard`,
                                      });
                                    }}
                                    title={`Click to copy ${volunteer.name}'s phone number`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-[#5c5b2f] rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {volunteer.name.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900 text-sm">
                                          {volunteer.name}
                                          <span className="text-xs text-gray-500 ml-2">• {volunteer.phone}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 capitalize">{volunteer.gender}</div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteVolunteer(volunteer.id, volunteer.name, role.role_label);
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                      title="Remove volunteer from this role"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sign Up Button */}
                          <div className="pt-2">
                            <Button
                              onClick={() => handleSignupClick(role)}
                              disabled={remainingSlots <= 0}
                              className={`w-full ${
                                remainingSlots > 0 
                                  ? "bg-[#5c5b2f] hover:bg-[#4a4a28] text-white" 
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                              }`}
                            >
                              {remainingSlots > 0 ? (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Sign Up
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  Role Full
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}

                    {/* Collapsed State - Just the button */}
                    {!isExpanded && (
                      <CardContent className="pt-0">
                        {/* Quick Volunteer Overview */}
                        {volunteers.length > 0 && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''} signed up
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRoleExpansion(role.id)}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <Button
                          onClick={() => handleSignupClick(role)}
                          disabled={remainingSlots <= 0}
                          className={`w-full ${
                            remainingSlots > 0 
                              ? "bg-[#5c5b2f] hover:bg-[#4a4a28] text-white" 
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {remainingSlots > 0 ? (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Sign Up
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Role Full
                            </>
                          )}
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {sortedAndFilteredRoles.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                {searchQuery 
                  ? "No roles match your filters" 
                  : "No volunteer roles available"
                }
              </h3>
              <p className="text-gray-500 mb-6 max-w-lg mx-auto">
                {searchQuery
                  ? "Try adjusting your search or filters to find volunteer opportunities."
                  : "This event doesn't have any volunteer roles set up yet. Contact the event point of contact for more information."
                }
              </p>
              {searchQuery && (
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </main>

        {/* Signup Modal */}
          <SignupModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            selectedRole={selectedRole}
            event={event}
            onSubmit={handleSignupSubmit}
            getRemainingSlots={getRemainingSlots}
            getExistingSignups={getExistingSignups}
            isSubmitting={isSubmitting}
          />

        {/* Delete Confirmation Dialog */}
        {deleteDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to remove {deleteDialog.volunteerName} from the {deleteDialog.roleName} role?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, volunteerId: null, volunteerName: "", roleName: "", phoneVerification: undefined, volunteerPhone: undefined })}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeleteVolunteer}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Password Dialog */}
        {passwordDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify Phone Number</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Removing:</strong> {passwordDialog.volunteerName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Role:</strong> {passwordDialog.roleName}
                </p>
              </div>
              <p className="text-gray-600 mb-4">
                Please enter the phone number used during signup to confirm deletion.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }} className="space-y-4">
                <PhoneInput
                  id="verify-phone"
                  value={phoneVerification}
                  onChange={(val) => setPhoneVerification(val)}
                  placeholder="Phone number"
                  className="border-gray-300 focus:border-[#5c5b2f] focus:ring-[#5c5b2f]/20"
                />
                
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setPasswordDialog({ isOpen: false, volunteerId: null, volunteerName: "", roleName: "", volunteerPhone: "" });
                      setPhoneVerification("");
                      setAdminPassword("");
                      setShowAdminOption(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#5c5b2f] hover:bg-[#4a4a28] text-white"
                  >
                    Verify Phone
                  </Button>
                </div>
              </form>

              {/* Admin Fallback Option */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdminOption(!showAdminOption)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  {showAdminOption ? "Hide" : "Forgot phone number? Contact POC"} 
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdminOption ? 'rotate-180' : ''}`} />
                </Button>
                
                {showAdminOption && (
                  <div className="mt-3 p-3 bg-red-25 border border-red-100 rounded-lg">
                    <p className="text-xs text-red-700 mb-3">
                      Admin access: Use this option only if you cannot verify phone number.
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleAdminPasswordSubmit(); }} className="space-y-3">
                      <Input
                        type="password"
                        placeholder="Admin Password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="border-red-200 focus:border-red-400 focus:ring-red-400/20"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-red-500 hover:bg-red-600 text-white text-sm"
                      >
                        Admin Override
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VolunteerSignup;
