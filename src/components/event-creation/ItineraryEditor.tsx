
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock, Sparkles, Users, UserPlus, X, Pen, ChevronRight } from "lucide-react";
import { formatTime24To12 } from "@/utils/timezoneUtils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { NumberStepper } from "@/components/ui/number-stepper";

// Safe ID generator that works in non-secure contexts (like local IP on mobile)
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

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

interface Contact {
  id: string;
  name: string;
  phone: string;
  source?: 'manual' | 'volunteer_signup' | 'account_signup';
  role?: 'poc' | 'volunteer' | 'admin';
}

interface ItineraryEditorProps {
  itinerary: ItineraryItem[];
  onItineraryChange: (itinerary: ItineraryItem[]) => void;
  startTime: string;
  endTime: string;
  isGenerated?: boolean;
  disabled?: boolean;
  onGenerateItinerary?: () => void;
  isGenerating?: boolean;
  eventTitle?: string;
  eventDescription?: string;
  contacts?: Contact[];
  onAddContact?: () => void;
  showValidation?: boolean;
}

const ItineraryEditor = ({
  itinerary,
  onItineraryChange,
  startTime,
  endTime,
  isGenerated = false,
  disabled = false,
  onGenerateItinerary,
  isGenerating = false,
  eventTitle,
  eventDescription,
  contacts = [],
  onAddContact,
  showValidation = false
}: ItineraryEditorProps) => {
  const [editingRole, setEditingRole] = useState<{ itemId: string, roleId: string } | null>(null);

  const timeToMinutes = (t?: string): number | null => {
    if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToHHMM = (mins: number): string => {
    const m = Math.max(0, Math.min(23 * 60 + 59, mins));
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hh)}:${pad(mm)}`;
  };

  // Auto-normalize: ensure each role's start matches its parent activity time,
  // preserving the role's duration. This fixes older items created before
  // auto-sync and keeps preview consistent when times are edited.
  useEffect(() => {
    let changedAny = false;
    const normalized = itinerary.map(item => {
      const itemStartM = timeToMinutes(item.time);
      if (itemStartM === null || item.volunteerRoles.length === 0) return item;

      let changed = false;
      const newRoles = item.volunteerRoles.map(role => {
        if (role.shiftStartTime === item.time) return role;

        const startM = timeToMinutes(role.shiftStartTime) ?? itemStartM;
        const endM = timeToMinutes(role.shiftEndTime) ?? startM + 60;
        const duration = Math.max(1, endM - startM);

        changed = true;
        return {
          ...role,
          shiftStartTime: minutesToHHMM(itemStartM),
          shiftEndTime: minutesToHHMM(itemStartM + duration)
        };
      });

      if (changed) {
        changedAny = true;
        return { ...item, volunteerRoles: newRoles };
      }
      return item;
    });

    if (changedAny) {
      onItineraryChange(normalized);
    }
  }, [itinerary]);

  const getRoleError = (role: VolunteerRole): string | null => {
    const s = timeToMinutes(role.shiftStartTime);
    const e = timeToMinutes(role.shiftEndTime);
    // Allow overnight shifts for multi-day events (like Ramadan events)
    // No validation error for overnight shifts
    return null;
  };

  const getOverlappingRoleIds = (roles: VolunteerRole[]): Set<string> => {
    const intervals = roles
      .map(r => ({ id: r.id, s: timeToMinutes(r.shiftStartTime), e: timeToMinutes(r.shiftEndTime) }))
      .filter(x => x.s !== null && x.e !== null && (x.e as number) > (x.s as number))
      .sort((a, b) => (a.s as number) - (b.s as number));
    const overlapped = new Set<string>();
    for (let i = 1; i < intervals.length; i++) {
      const prev = intervals[i - 1];
      const curr = intervals[i];
      if ((curr.s as number) < (prev.e as number)) {
        overlapped.add(prev.id);
        overlapped.add(curr.id);
      }
    }
    return overlapped;
  };
  const addItineraryItem = () => {
    const newItem: ItineraryItem = {
      id: generateId(),
      time: startTime,
      title: "",
      description: "",
      volunteerRoles: []
    };
    onItineraryChange([...itinerary, newItem]);
  };

  const updateItineraryItem = (id: string, field: keyof ItineraryItem, value: any) => {
    const updated = itinerary.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onItineraryChange(updated);
  };

  const removeItineraryItem = (id: string) => {
    onItineraryChange(itinerary.filter(item => item.id !== id));
  };

  // When an itinerary time changes, shift any child roles that matched the old
  // start time (or were created with that default) to the new start time and
  // preserve each role's duration.
  const updateItineraryItemTime = (itemId: string, newTime: string) => {
    const next = itinerary.map(item => {
      if (item.id !== itemId) return item;

      const oldTime = item.time;
      if (!/^\d{2}:\d{2}$/.test(newTime) || !/^\d{2}:\d{2}$/.test(oldTime)) {
        // Fallback: just update the item time
        return { ...item, time: newTime };
      }

      // Sync ALL child roles' start times to the new activity time,
      // preserving each role's original duration.
      const updatedRoles = item.volunteerRoles.map(role => {
        const startM = timeToMinutes(role.shiftStartTime) ?? 0;
        const endM = timeToMinutes(role.shiftEndTime) ?? startM + 60;
        const duration = Math.max(1, endM - startM);

        const newStartM = timeToMinutes(newTime) ?? startM;
        const newEndM = newStartM + duration;

        return {
          ...role,
          shiftStartTime: minutesToHHMM(newStartM),
          shiftEndTime: minutesToHHMM(newEndM)
        };
      });

      return { ...item, time: newTime, volunteerRoles: updatedRoles };
    });

    onItineraryChange(next);
  };

  const addVolunteerRole = (itemId: string) => {
    // Find the itinerary item to get its time
    const item = itinerary.find(i => i.id === itemId);
    const itemTime = item?.time || "00:00";

    // Calculate end time (default to 1 hour after start)
    const [hours, minutes] = itemTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + 60; // Add 1 hour
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    const newRole: VolunteerRole = {
      id: generateId(),
      roleLabel: "",
      slotsBrother: 0,
      slotsSister: 0,
      slotsFlexible: 0,
      shiftStartTime: itemTime,
      shiftEndTime: endTime,
      notes: "",
      suggestedPOC: []
    };

    const updated = itinerary.map(item =>
      item.id === itemId
        ? { ...item, volunteerRoles: [...item.volunteerRoles, newRole] }
        : item
    );
    onItineraryChange(updated);
  };

  const addVolunteerRoleMobile = (itemId: string) => {
    const item = itinerary.find(i => i.id === itemId);
    const itemTime = item?.time || "00:00";

    // Calculate end time (default to 1 hour + 5 mins to handle potential overlaps carefully, or just standard 1 hour)
    // Reusing logic from addVolunteerRole
    const [hours, minutes] = itemTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + 60;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    const newRoleId = generateId();
    const newRole: VolunteerRole = {
      id: newRoleId,
      roleLabel: "",
      slotsBrother: 0,
      slotsSister: 0,
      slotsFlexible: 0,
      shiftStartTime: itemTime,
      shiftEndTime: endTime,
      notes: "",
      suggestedPOC: []
    };

    const updated = itinerary.map(item =>
      item.id === itemId
        ? { ...item, volunteerRoles: [...item.volunteerRoles, newRole] }
        : item
    );
    onItineraryChange(updated);

    // Open sheet for this new role
    setEditingRole({ itemId, roleId: newRoleId });
  };

  const updateVolunteerRole = (itemId: string, roleId: string, field: keyof VolunteerRole, value: any) => {
    const updated = itinerary.map(item =>
      item.id === itemId
        ? {
          ...item,
          volunteerRoles: item.volunteerRoles.map(role =>
            role.id === roleId ? { ...role, [field]: value } : role
          )
        }
        : item
    );
    onItineraryChange(updated);
  };

  const removeVolunteerRole = (itemId: string, roleId: string) => {
    const updated = itinerary.map(item =>
      item.id === itemId
        ? {
          ...item,
          volunteerRoles: item.volunteerRoles.filter(role => role.id !== roleId)
        }
        : item
    );
    onItineraryChange(updated);
  };

  const canGenerateItinerary = eventTitle && eventDescription && startTime && endTime && onGenerateItinerary;

  const getTotalVolunteerSlots = (roles: VolunteerRole[]) => {
    return roles.reduce((total, role) => total + role.slotsBrother + role.slotsSister + role.slotsFlexible, 0);
  };

  return (
    <Card className="border-white/10 md:border-umma-200 bg-white/5 shadow-sm md:shadow-none">
      <CardHeader className="pb-3 md:pb-2 px-3 md:px-6">
        <CardTitle className="flex items-center space-x-2 text-foreground md:text-umma-800 text-lg md:text-base">
          <Clock className="w-5 h-5" />
          <span>Event Timeline & Roles</span>
        </CardTitle>
        <p className="text-sm md:text-xs text-white/40 md:text-umma-600 mt-1">
          Build your event schedule and assign volunteer roles.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-3 md:px-6">
        {itinerary.length === 0 ? (
          <div className="text-center py-10 md:py-8 bg-white/5 md:bg-umma-50 rounded-3xl md:rounded-xl border border-white/10 md:border-umma-200">
            <div className="w-16 h-16 md:w-12 md:h-12 rounded-full bg-white/10 md:bg-umma-100 mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 md:w-6 md:h-6 text-white/30 md:text-umma-400" />
            </div>
            <h3 className="text-lg md:text-base font-semibold text-white/70 md:text-umma-700 mb-2">No activities yet</h3>
            <p className="text-white/40 md:text-umma-600 mb-6 text-sm px-4">Start by adding your first activity with volunteer roles</p>

            <div className="flex flex-col gap-3 px-6 md:px-0 md:flex-row md:justify-center">
              <Button
                onClick={addItineraryItem}
                variant="default"
                className="h-14 md:h-11 text-base md:text-sm font-semibold bg-umma-600 hover:bg-umma-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl md:rounded-lg touch-manipulation"
                disabled={disabled}
              >
                <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                Add Activity
              </Button>

              {onGenerateItinerary && (
                <Button
                  onClick={onGenerateItinerary}
                  variant="outline"
                  className="h-14 md:h-11 text-base md:text-sm font-medium border border-white/10 md:border-umma-500 text-white/70 md:text-umma-700 hover:bg-white/5 md:hover:bg-umma-50 rounded-3xl md:rounded-lg touch-manipulation"
                  disabled={!canGenerateItinerary || isGenerating || disabled}
                >
                  <Sparkles className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                  {isGenerating ? "Generating..." : "AI Suggestions"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {itinerary.map((item, index) => {
                const overlappingIds = getOverlappingRoleIds(item.volunteerRoles);
                return (
                  <div key={item.id} className="bg-white/5 md:bg-umma-50 rounded-3xl md:rounded-xl border border-white/10 md:border-umma-200 overflow-hidden">
                    {/* Main Itinerary Item */}
                    <div className="p-3 md:p-4 space-y-4 overflow-visible">
                      {/* Mobile: Compact header */}
                      <div className="flex items-start justify-between gap-3 md:hidden">
                        <div className="flex-1">
                          <Input
                            value={item.title}
                            onChange={(e) => updateItineraryItem(item.id, 'title', e.target.value)}
                            placeholder="Activity name..."
                            className="text-lg font-semibold h-12 border-0 bg-transparent focus-visible:ring-0 placeholder:text-white/30 px-0 md:px-0"
                            disabled={disabled}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItineraryItem(item.id)}
                          className="h-9 w-9 p-0 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-full"
                          disabled={disabled}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Mobile: Native iOS Time Picker */}
                      <div className="md:hidden space-y-2">
                        <Label className="text-sm font-semibold text-white/50">Time</Label>
                        <Input
                          type="time"
                          value={item.time}
                          onChange={(e) => updateItineraryItemTime(item.id, e.target.value)}
                          className="h-12 border border-white/10 focus-visible:ring-umma-500 rounded-2xl text-base font-medium"
                          disabled={disabled}
                        />
                      </div>

                      {/* Desktop: Original layout */}
                      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Time</Label>
                          <TimeInput12h
                            value={item.time}
                            onChange={(val) => updateItineraryItemTime(item.id, val)}
                            className="text-base sm:text-sm border-umma-200 focus-visible:ring-umma-500"
                            disabled={disabled}
                          />
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                          <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Activity Title</Label>
                          <Input
                            value={item.title}
                            onChange={(e) => updateItineraryItem(item.id, 'title', e.target.value)}
                            placeholder="e.g., Doors Open"
                            className="text-base sm:text-sm h-12 sm:h-11 border-umma-200 focus-visible:ring-umma-500"
                            disabled={disabled}
                          />
                        </div>
                      </div>

                      {/* Description - Collapsible on mobile */}
                      <div className="space-y-2">
                        <div className="hidden md:flex justify-between items-center">
                          <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Description</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItineraryItem(item.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                            disabled={disabled}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItineraryItem(item.id, 'description', e.target.value)}
                          placeholder="What happens during this time? (optional)"
                          rows={2}
                          className="text-base md:text-sm resize-none border-white/10 md:border-umma-200 focus-visible:ring-umma-500 rounded-2xl md:rounded-lg"
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    {/* Volunteer Roles Section */}
                    <div className="border-t border-white/10 md:border-umma-200 bg-white/5 p-3 md:p-4">
                      <div className="flex items-center justify-between mb-4 md:mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 md:w-4 md:h-4 text-white/40 md:text-umma-600" />
                          <Label className="text-base md:text-sm font-semibold text-white/70 md:text-umma-700">Roles</Label>
                          {item.volunteerRoles.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-umma-100 text-umma-700 border-0">
                              {getTotalVolunteerSlots(item.volunteerRoles)} volunteers
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addVolunteerRole(item.id)}
                            className="hidden md:flex h-8 px-3 text-xs border-umma-500 text-umma-700 hover:bg-umma-50"
                            disabled={disabled}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Add Role
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => addVolunteerRoleMobile(item.id)}
                            className="md:hidden h-11 px-4 text-sm bg-umma-600 hover:bg-umma-700 text-white font-semibold rounded-3xl touch-manipulation"
                            disabled={disabled}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Role
                          </Button>
                        </div>
                      </div>

                      {item.volunteerRoles.length === 0 ? (
                        <div className="text-center py-6 md:py-4">
                          <div className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-white/10 mx-auto mb-3 flex items-center justify-center">
                            <Users className="w-6 h-6 md:w-5 md:h-5 text-white/30" />
                          </div>
                          <p className="text-sm text-white/40 md:text-umma-500">
                            No roles yet. Tap "Add Role" to get started.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {item.volunteerRoles.map((role) => {
                            const roleError = getRoleError(role);
                            const overlaps = overlappingIds.has(role.id);
                            return (
                              <div key={role.id} className="bg-umma-25 border border-umma-100 rounded-2xl p-3 sm:p-3">
                                <div className="hidden md:block">
                                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-3 overflow-visible">
                                    <div className="space-y-2 sm:space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
                                      <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Role Name</Label>
                                      <Input
                                        value={role.roleLabel}
                                        onChange={(e) => updateVolunteerRole(item.id, role.id, 'roleLabel', e.target.value)}
                                        placeholder="e.g., Greeter"
                                        className="text-base sm:text-sm h-12 sm:h-11 border-umma-200 focus-visible:ring-umma-500"
                                        disabled={disabled}
                                      />
                                    </div>

                                    <div className="space-y-2 sm:space-y-1">
                                      <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Brother Slots</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="numeric"
                                        value={role.slotsBrother === 0 ? '' : role.slotsBrother}
                                        onChange={(e) => {
                                          const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                          updateVolunteerRole(item.id, role.id, 'slotsBrother', next);
                                        }}
                                        onBlur={(e) => {
                                          // Ensure a valid number on blur
                                          const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                          if (next !== role.slotsBrother) {
                                            updateVolunteerRole(item.id, role.id, 'slotsBrother', next);
                                          }
                                        }}
                                        className="text-base sm:text-sm h-12 sm:h-11 border-umma-200 focus-visible:ring-umma-500"
                                        disabled={disabled}
                                      />
                                    </div>

                                    <div className="space-y-2 sm:space-y-1">
                                      <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Sister Slots</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="numeric"
                                        value={role.slotsSister === 0 ? '' : role.slotsSister}
                                        onChange={(e) => {
                                          const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                          if (next !== role.slotsSister) {
                                            updateVolunteerRole(item.id, role.id, 'slotsSister', next);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                          if (next !== role.slotsSister) {
                                            updateVolunteerRole(item.id, role.id, 'slotsSister', next);
                                          }
                                        }}
                                        className="text-base sm:text-sm h-12 sm:h-11 border-umma-200 focus-visible:ring-umma-500"
                                        disabled={disabled}
                                      />
                                    </div>

                                    <div className="space-y-2 sm:space-y-1">
                                      <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Either Gender</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="numeric"
                                        value={role.slotsFlexible === 0 ? '' : role.slotsFlexible}
                                        onChange={(e) => {
                                          const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                          updateVolunteerRole(item.id, role.id, 'slotsFlexible', next);
                                        }}
                                        onBlur={(e) => {
                                          const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                          if (next !== role.slotsFlexible) {
                                            updateVolunteerRole(item.id, role.id, 'slotsFlexible', next);
                                          }
                                        }}
                                        className="text-base sm:text-sm h-12 sm:h-11 border-umma-200 focus-visible:ring-umma-500"
                                        disabled={disabled}
                                      />
                                      <div className="text-sm sm:text-xs text-umma-600 font-medium">
                                        Can be filled by either brothers or sisters
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 sm:mt-3 space-y-3 sm:space-y-2">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                                      <div className="space-y-2 sm:space-y-1">
                                        <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Points of Contact</Label>
                                        <div className="space-y-3 sm:space-y-2">
                                          {/* Display selected points of contact as tags */}
                                          <div className="flex flex-wrap gap-2 sm:gap-1">
                                            {(role.suggestedPOC || []).map((pocId, index) => {
                                              const contact = contacts.find(c => c.id === pocId);
                                              return contact ? (
                                                <div
                                                  key={pocId}
                                                  className="flex items-center gap-1.5 sm:gap-1 px-3 py-1.5 sm:px-2 sm:py-1 bg-umma-100 text-umma-700 rounded-md text-sm sm:text-xs"
                                                >
                                                  <span>{contact.name}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const newPOCs = (role.suggestedPOC || []).filter((_, i) => i !== index);
                                                      updateVolunteerRole(item.id, role.id, 'suggestedPOC', newPOCs);
                                                    }}
                                                    className="text-umma-500 hover:text-umma-700"
                                                    disabled={disabled}
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ) : null;
                                            })}
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <Select
                                              onValueChange={(value) => {
                                                if (value && !(role.suggestedPOC || []).includes(value)) {
                                                  const newPOCs = [...(role.suggestedPOC || []), value];
                                                  updateVolunteerRole(item.id, role.id, 'suggestedPOC', newPOCs);
                                                }
                                              }}
                                              disabled={disabled}
                                            >
                                              <SelectTrigger className="text-base sm:text-sm border-umma-200 h-12 sm:h-11 px-3 focus-visible:ring-umma-500 flex-1">
                                                <SelectValue placeholder="Add coordinator" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {contacts
                                                  .filter(contact => {
                                                    const roleVal = (contact as any).role as ('poc' | 'volunteer' | 'admin' | undefined);
                                                    const sourceVal = contact.source as ('manual' | 'volunteer_signup' | 'account_signup' | undefined);
                                                    const isPoc = roleVal === 'poc' || (!roleVal && (sourceVal === 'manual' || sourceVal === 'account_signup'));
                                                    const notSelected = !((role.suggestedPOC || []).includes(contact.id));
                                                    return isPoc && notSelected;
                                                  })
                                                  .map((contact) => (
                                                    <SelectItem key={contact.id} value={contact.id}>
                                                      {contact.name} - {contact.phone}
                                                    </SelectItem>
                                                  ))}
                                              </SelectContent>
                                            </Select>

                                            {onAddContact && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={onAddContact}
                                                className="h-11 w-12 p-0 border-umma-200 text-umma-700 hover:bg-umma-50 focus-visible:ring-umma-500 flex-shrink-0"
                                                disabled={disabled}
                                              >
                                                <Plus className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-2 sm:space-y-1">
                                        <Label className="text-sm sm:text-xs text-umma-700 font-semibold">End Time</Label>
                                        <TimeInput12h
                                          value={role.shiftEndTime}
                                          onChange={(val) => updateVolunteerRole(item.id, role.id, 'shiftEndTime', val)}
                                          className="text-base sm:text-sm border-umma-200 focus-visible:ring-umma-500"
                                          disabled={disabled}
                                        />
                                        <div className="text-sm sm:text-xs text-umma-600 font-medium">When this role ends</div>
                                        {showValidation && roleError && (
                                          <div className="text-sm sm:text-[11px] text-red-400">{roleError}</div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-2 sm:space-y-1">
                                      <Label className="text-sm sm:text-xs text-umma-700 font-semibold">Notes</Label>
                                      <Input
                                        value={role.notes || ""}
                                        onChange={(e) => updateVolunteerRole(item.id, role.id, 'notes', e.target.value)}
                                        placeholder="Special instructions or requirements"
                                        className="text-base sm:text-sm h-12 sm:h-11 border-umma-200 focus-visible:ring-umma-500"
                                        disabled={disabled}
                                      />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeVolunteerRole(item.id, role.id)}
                                        className="h-10 sm:h-6 px-3 sm:px-2 text-sm sm:text-xs text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                        disabled={disabled}
                                      >
                                        <X className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                                        Remove Role
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile: Tappable role card */}
                                <div
                                  className="md:hidden flex items-center justify-between cursor-pointer active:scale-[0.98] -mx-1 -my-1 p-2.5 rounded-2xl transition-all bg-white/5 border border-white/10 shadow-sm touch-manipulation"
                                  onClick={() => setEditingRole({ itemId: item.id, roleId: role.id })}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-foreground text-base truncate">
                                      {role.roleLabel || <span className="text-white/30 font-normal italic">Untitled Role</span>}
                                    </div>
                                    <div className="text-sm text-white/40 flex items-center flex-wrap gap-x-4 gap-y-1 mt-1">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        <Users className="w-4 h-4 text-umma-500" />
                                        <span className="text-white/70">{role.slotsBrother + role.slotsSister + role.slotsFlexible}</span>
                                        <span className="text-white/30">needed</span>
                                      </span>
                                      <span className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-white/30" />
                                        {formatTime24To12(role.shiftStartTime)} - {formatTime24To12(role.shiftEndTime)}
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-white/20 ml-2 flex-shrink-0" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                onClick={addItineraryItem}
                variant="outline"
                className="flex-1 h-14 md:h-11 text-base md:text-sm font-semibold border border-white/10 md:border-umma-500 text-white/70 md:text-umma-700 hover:bg-white/5 md:hover:bg-umma-100 rounded-3xl md:rounded-lg touch-manipulation"
                disabled={disabled}
              >
                <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                Add Another Activity
              </Button>

              {onGenerateItinerary && (
                <Button
                  onClick={onGenerateItinerary}
                  variant="outline"
                  className="flex-1 h-14 md:h-11 text-base md:text-sm font-medium border border-white/10 md:border-umma-500 text-white/70 md:text-umma-700 hover:bg-white/5 md:hover:bg-umma-50 rounded-3xl md:rounded-lg touch-manipulation"
                  disabled={!canGenerateItinerary || isGenerating || disabled}
                >
                  <Sparkles className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                  {isGenerating ? "Generating..." : "AI Suggestions"}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
      <Sheet open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] sm:max-w-md overflow-y-auto rounded-t-3xl px-0 pb-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-white/5 sticky top-0 bg-white/5 z-10">
            <div className="text-left">
              <SheetTitle className="text-xl font-bold text-foreground text-left">Edit Role</SheetTitle>
              <SheetDescription className="text-sm text-white/40 mt-0.5 text-left">Configure volunteer requirements</SheetDescription>
            </div>
          </SheetHeader>

          <div className="px-5 py-5 space-y-6 pb-4 flex-1 overflow-y-auto min-h-0">
            {editingRole && (() => {
              const activeItem = itinerary.find(i => i.id === editingRole.itemId);
              const activeRoleData = activeItem?.volunteerRoles.find(r => r.id === editingRole.roleId);

              if (!activeItem || !activeRoleData) return null;

              return (
                <>
                  {/* Role Name - Most Important */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-white/40 uppercase tracking-wider">Role Name</Label>
                    <Input
                      value={activeRoleData.roleLabel}
                      onChange={(e) => updateVolunteerRole(activeItem.id, activeRoleData.id, 'roleLabel', e.target.value)}
                      placeholder="e.g., Greeter, Setup Crew..."
                      className="text-xl font-semibold h-14 border border-white/10 focus-visible:ring-umma-500 rounded-2xl placeholder:font-normal placeholder:text-white/30"
                    />
                  </div>

                  {/* Volunteer Counts - Stepper UI */}
                  <div className="space-y-4 bg-white/5 rounded-2xl p-4">
                    <Label className="text-sm font-semibold text-white/40 uppercase tracking-wider">Volunteers Needed</Label>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-base">Brothers</div>
                          <div className="text-xs text-white/40">Male volunteers</div>
                        </div>
                        <NumberStepper
                          value={activeRoleData.slotsBrother}
                          onChange={(val) => updateVolunteerRole(activeItem.id, activeRoleData.id, 'slotsBrother', val)}
                          min={0}
                        />
                      </div>

                      <div className="border-t border-white/10" />

                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-base">Sisters</div>
                          <div className="text-xs text-white/40">Female volunteers</div>
                        </div>
                        <NumberStepper
                          value={activeRoleData.slotsSister}
                          onChange={(val) => updateVolunteerRole(activeItem.id, activeRoleData.id, 'slotsSister', val)}
                          min={0}
                        />
                      </div>

                      <div className="border-t border-white/10" />

                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-base">Either Gender</div>
                          <div className="text-xs text-white/40">Flexible assignment</div>
                        </div>
                        <NumberStepper
                          value={activeRoleData.slotsFlexible}
                          onChange={(val) => updateVolunteerRole(activeItem.id, activeRoleData.id, 'slotsFlexible', val)}
                          min={0}
                        />
                      </div>
                    </div>

                    {/* Total indicator */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="text-sm font-semibold text-white/50">Total volunteers</span>
                      <span className="text-lg font-bold text-umma-600">
                        {activeRoleData.slotsBrother + activeRoleData.slotsSister + activeRoleData.slotsFlexible}
                      </span>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-white/40 uppercase tracking-wider">Shift Time</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm text-white/50 font-medium">Start</Label>
                        <div className="p-4 bg-white/10 rounded-xl border border-white/10 text-white/70 font-semibold text-base text-center">
                          {formatTime24To12(activeRoleData.shiftStartTime)}
                        </div>
                        <p className="text-xs text-white/30 text-center mb-0">Synced with activity</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-white/50 font-medium">End</Label>
                        <Input
                          type="time"
                          value={activeRoleData.shiftEndTime}
                          onChange={(e) => updateVolunteerRole(activeItem.id, activeRoleData.id, 'shiftEndTime', e.target.value)}
                          className="h-14 border-2 border-white/10 rounded-xl text-base font-semibold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes - Optional */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-white/40 uppercase tracking-wider">Notes (Optional)</Label>
                    <Textarea
                      value={activeRoleData.notes || ""}
                      onChange={(e) => updateVolunteerRole(activeItem.id, activeRoleData.id, 'notes', e.target.value)}
                      placeholder="Special instructions, requirements, or details for this role..."
                      rows={3}
                      className="text-base resize-none border-2 border-white/10 rounded-xl"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      className="w-full h-12 text-base text-red-400 hover:text-red-700 hover:bg-red-500/10 font-medium"
                      onClick={() => {
                        removeVolunteerRole(activeItem.id, activeRoleData.id);
                        setEditingRole(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Role
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Sticky Done Button */}
          <div className="mt-auto p-4 pt-3 bg-white/5 border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <Button
              className="w-full h-14 text-lg font-bold bg-umma-600 hover:bg-umma-700 text-white shadow-xl rounded-xl touch-manipulation"
              onClick={() => setEditingRole(null)}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default ItineraryEditor;
