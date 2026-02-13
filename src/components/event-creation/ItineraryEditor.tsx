
import { useState, useEffect, useMemo } from "react";
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
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

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

  // Flatten all roles from itinerary items into a single list
  const allRoles = useMemo(() => {
    return itinerary.flatMap(item =>
      item.volunteerRoles.map(role => ({
        ...role,
        _itemId: item.id,
        _groupLabel: item.title || '',
      }))
    );
  }, [itinerary]);

  // Helper to find which itinerary item a role belongs to
  const findRoleParent = (roleId: string): { item: ItineraryItem; role: VolunteerRole } | null => {
    for (const item of itinerary) {
      const role = item.volunteerRoles.find(r => r.id === roleId);
      if (role) return { item, role };
    }
    return null;
  };

  const getRoleError = (role: VolunteerRole): string | null => {
    // Allow overnight shifts for multi-day events (like Ramadan events)
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

  const overlappingIds = useMemo(() => {
    const allFlatRoles = itinerary.flatMap(item => item.volunteerRoles);
    return getOverlappingRoleIds(allFlatRoles);
  }, [itinerary]);

  // Add a new role — creates a default itinerary item if none exist
  const addRole = () => {
    // Calculate times
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + 60;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const roleEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    const newRole: VolunteerRole = {
      id: generateId(),
      roleLabel: "",
      slotsBrother: 0,
      slotsSister: 0,
      slotsFlexible: 0,
      shiftStartTime: startTime,
      shiftEndTime: roleEndTime,
      notes: "",
      suggestedPOC: []
    };

    if (itinerary.length === 0) {
      // Create a default container item
      const newItem: ItineraryItem = {
        id: generateId(),
        time: startTime,
        title: "",
        description: "",
        volunteerRoles: [newRole]
      };
      onItineraryChange([newItem]);
    } else {
      // Add to the first itinerary item
      const updated = [...itinerary];
      updated[0] = {
        ...updated[0],
        volunteerRoles: [...updated[0].volunteerRoles, newRole]
      };
      onItineraryChange(updated);
    }

    return newRole.id;
  };

  const addRoleMobile = () => {
    const newRoleId = addRole();
    setEditingRoleId(newRoleId);
  };

  const updateRole = (roleId: string, field: keyof VolunteerRole, value: any) => {
    const updated = itinerary.map(item => ({
      ...item,
      volunteerRoles: item.volunteerRoles.map(role =>
        role.id === roleId ? { ...role, [field]: value } : role
      )
    }));
    onItineraryChange(updated);
  };

  const removeRole = (roleId: string) => {
    const updated = itinerary.map(item => ({
      ...item,
      volunteerRoles: item.volunteerRoles.filter(role => role.id !== roleId)
    }));
    // Remove empty itinerary items
    onItineraryChange(updated.filter(item => item.volunteerRoles.length > 0));
  };

  const canGenerateItinerary = eventTitle && eventDescription && startTime && endTime && onGenerateItinerary;

  const getTotalVolunteerSlots = () => {
    return allRoles.reduce((total, role) => total + role.slotsBrother + role.slotsSister + role.slotsFlexible, 0);
  };

  // Find the currently editing role data
  const editingRoleData = editingRoleId ? findRoleParent(editingRoleId) : null;

  return (
    <Card className="border-white/10 bg-white/5 shadow-sm">
      <CardHeader className="pb-3 md:pb-2 px-3 md:px-6">
        <CardTitle className="flex items-center space-x-2 text-foreground text-lg md:text-base">
          <Users className="w-5 h-5" />
          <span>Volunteer Roles</span>
        </CardTitle>
        <p className="text-sm md:text-xs text-white/40 mt-1">
          Add the volunteer roles needed for your event.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-3 md:px-6">
        {allRoles.length === 0 ? (
          <div className="text-center py-10 md:py-8 bg-white/5 rounded-3xl md:rounded-xl border border-white/10">
            <div className="w-16 h-16 md:w-12 md:h-12 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 md:w-6 md:h-6 text-white/30" />
            </div>
            <h3 className="text-lg md:text-base font-semibold text-white/70 mb-2">No roles yet</h3>
            <p className="text-white/40 mb-6 text-sm px-4">Add volunteer roles for your event</p>

            <div className="flex flex-col gap-3 px-6 md:px-0 md:flex-row md:justify-center">
              <Button
                onClick={() => { const id = addRole(); }}
                variant="default"
                className="h-14 md:h-11 text-base md:text-sm font-semibold bg-gold-400 hover:bg-gold-300 text-navy-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl md:rounded-lg touch-manipulation"
                disabled={disabled}
              >
                <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                Add Role
              </Button>

              {onGenerateItinerary && (
                <Button
                  onClick={onGenerateItinerary}
                  variant="outline"
                  className="h-14 md:h-11 text-base md:text-sm font-medium border border-white/10 text-white/70 hover:bg-white/5 rounded-3xl md:rounded-lg touch-manipulation"
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
            {/* Summary bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-gold-400/10 text-gold-300 border-0">
                  {allRoles.length} {allRoles.length === 1 ? 'role' : 'roles'}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-white/5 text-white/50 border-0">
                  {getTotalVolunteerSlots()} volunteers needed
                </Badge>
              </div>
            </div>

            {/* Flat role list */}
            <div className="space-y-3">
              {allRoles.map((role) => {
                const roleError = getRoleError(role);
                const overlaps = overlappingIds.has(role.id);
                return (
                  <div key={role.id} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    {/* Desktop: Inline editing */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-3 overflow-visible">
                        <div className="space-y-1 col-span-2 lg:col-span-1">
                          <Label className="text-xs text-white/60 font-semibold">Role Name</Label>
                          <Input
                            value={role.roleLabel}
                            onChange={(e) => updateRole(role.id, 'roleLabel', e.target.value)}
                            placeholder="e.g., Greeter"
                            className="text-sm h-11 border-white/10 focus-visible:ring-gold-400"
                            disabled={disabled}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-white/60 font-semibold">Brother Slots</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={role.slotsBrother === 0 ? '' : role.slotsBrother}
                            onChange={(e) => {
                              const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                              updateRole(role.id, 'slotsBrother', next);
                            }}
                            onBlur={(e) => {
                              const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                              if (next !== role.slotsBrother) {
                                updateRole(role.id, 'slotsBrother', next);
                              }
                            }}
                            className="text-sm h-11 border-white/10 focus-visible:ring-gold-400"
                            disabled={disabled}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-white/60 font-semibold">Sister Slots</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={role.slotsSister === 0 ? '' : role.slotsSister}
                            onChange={(e) => {
                              const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                              if (next !== role.slotsSister) {
                                updateRole(role.id, 'slotsSister', next);
                              }
                            }}
                            onBlur={(e) => {
                              const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                              if (next !== role.slotsSister) {
                                updateRole(role.id, 'slotsSister', next);
                              }
                            }}
                            className="text-sm h-11 border-white/10 focus-visible:ring-gold-400"
                            disabled={disabled}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-white/60 font-semibold">Either Gender</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={role.slotsFlexible === 0 ? '' : role.slotsFlexible}
                            onChange={(e) => {
                              const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                              updateRole(role.id, 'slotsFlexible', next);
                            }}
                            onBlur={(e) => {
                              const next = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                              if (next !== role.slotsFlexible) {
                                updateRole(role.id, 'slotsFlexible', next);
                              }
                            }}
                            className="text-sm h-11 border-white/10 focus-visible:ring-gold-400"
                            disabled={disabled}
                          />
                          <div className="text-xs text-white/40 font-medium">
                            Can be filled by either brothers or sisters
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-white/60 font-semibold">Points of Contact</Label>
                            <div className="space-y-2">
                              {/* Display selected points of contact as tags */}
                              <div className="flex flex-wrap gap-1">
                                {(role.suggestedPOC || []).map((pocId, index) => {
                                  const contact = contacts.find(c => c.id === pocId);
                                  return contact ? (
                                    <div
                                      key={pocId}
                                      className="flex items-center gap-1 px-2 py-1 bg-gold-400/10 text-gold-300 rounded-md text-xs"
                                    >
                                      <span>{contact.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newPOCs = (role.suggestedPOC || []).filter((_, i) => i !== index);
                                          updateRole(role.id, 'suggestedPOC', newPOCs);
                                        }}
                                        className="text-white/40 hover:text-white/60"
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
                                      updateRole(role.id, 'suggestedPOC', newPOCs);
                                    }
                                  }}
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="text-sm border-white/10 h-11 px-3 focus-visible:ring-gold-400 flex-1">
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
                                    className="h-11 w-12 p-0 border-white/10 text-white/60 hover:bg-white/10 focus-visible:ring-gold-400 flex-shrink-0"
                                    disabled={disabled}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-white/60 font-semibold">Start Time</Label>
                              <TimeInput12h
                                value={role.shiftStartTime}
                                onChange={(val) => updateRole(role.id, 'shiftStartTime', val)}
                                className="text-sm border-white/10 focus-visible:ring-gold-400"
                                disabled={disabled}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-white/60 font-semibold">End Time</Label>
                              <TimeInput12h
                                value={role.shiftEndTime}
                                onChange={(val) => updateRole(role.id, 'shiftEndTime', val)}
                                className="text-sm border-white/10 focus-visible:ring-gold-400"
                                disabled={disabled}
                              />
                              {showValidation && roleError && (
                                <div className="text-[11px] text-red-400">{roleError}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-white/60 font-semibold">Notes</Label>
                          <Input
                            value={role.notes || ""}
                            onChange={(e) => updateRole(role.id, 'notes', e.target.value)}
                            placeholder="Special instructions or requirements"
                            className="text-sm h-11 border-white/10 focus-visible:ring-gold-400"
                            disabled={disabled}
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRole(role.id)}
                            className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            disabled={disabled}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Remove Role
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Mobile: Tappable role card */}
                    <div
                      className="md:hidden flex items-center justify-between cursor-pointer active:scale-[0.98] -mx-1 -my-1 p-2.5 rounded-2xl transition-all bg-white/5 border border-white/10 shadow-sm touch-manipulation"
                      onClick={() => setEditingRoleId(role.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-base truncate">
                          {role.roleLabel || <span className="text-white/30 font-normal italic">Untitled Role</span>}
                        </div>
                        <div className="text-sm text-white/40 flex items-center flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Users className="w-4 h-4 text-gold-400" />
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

            <div className="flex flex-col gap-3 md:flex-row">
              <Button
                onClick={() => { addRole(); }}
                variant="outline"
                className="flex-1 h-14 md:h-11 text-base md:text-sm font-semibold border border-white/10 text-white/70 hover:bg-white/5 rounded-3xl md:rounded-lg touch-manipulation"
                disabled={disabled}
              >
                <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                Add Another Role
              </Button>

              {onGenerateItinerary && (
                <Button
                  onClick={onGenerateItinerary}
                  variant="outline"
                  className="flex-1 h-14 md:h-11 text-base md:text-sm font-medium border border-white/10 text-white/70 hover:bg-white/5 rounded-3xl md:rounded-lg touch-manipulation"
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

      {/* Mobile editing sheet */}
      <Sheet open={!!editingRoleId} onOpenChange={(open) => !open && setEditingRoleId(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] sm:max-w-md overflow-y-auto rounded-t-3xl px-0 pb-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-white/5 sticky top-0 bg-white/5 z-10">
            <div className="text-left">
              <SheetTitle className="text-xl font-bold text-foreground text-left">Edit Role</SheetTitle>
              <SheetDescription className="text-sm text-white/40 mt-0.5 text-left">Configure volunteer requirements</SheetDescription>
            </div>
          </SheetHeader>

          <div className="px-5 py-5 space-y-6 pb-4 flex-1 overflow-y-auto min-h-0">
            {editingRoleData && (() => {
              const activeRoleData = editingRoleData.role;

              return (
                <>
                  {/* Role Name */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-white/40 uppercase tracking-wider">Role Name</Label>
                    <Input
                      value={activeRoleData.roleLabel}
                      onChange={(e) => updateRole(activeRoleData.id, 'roleLabel', e.target.value)}
                      placeholder="e.g., Greeter, Setup Crew..."
                      className="text-xl font-semibold h-14 border border-white/10 focus-visible:ring-gold-400 rounded-2xl placeholder:font-normal placeholder:text-white/30"
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
                          onChange={(val) => updateRole(activeRoleData.id, 'slotsBrother', val)}
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
                          onChange={(val) => updateRole(activeRoleData.id, 'slotsSister', val)}
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
                          onChange={(val) => updateRole(activeRoleData.id, 'slotsFlexible', val)}
                          min={0}
                        />
                      </div>
                    </div>

                    {/* Total indicator */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="text-sm font-semibold text-white/50">Total volunteers</span>
                      <span className="text-lg font-bold text-gold-400">
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
                        <Input
                          type="time"
                          value={activeRoleData.shiftStartTime}
                          onChange={(e) => updateRole(activeRoleData.id, 'shiftStartTime', e.target.value)}
                          className="h-14 border-2 border-white/10 rounded-xl text-base font-semibold text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-white/50 font-medium">End</Label>
                        <Input
                          type="time"
                          value={activeRoleData.shiftEndTime}
                          onChange={(e) => updateRole(activeRoleData.id, 'shiftEndTime', e.target.value)}
                          className="h-14 border-2 border-white/10 rounded-xl text-base font-semibold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-white/40 uppercase tracking-wider">Notes (Optional)</Label>
                    <Textarea
                      value={activeRoleData.notes || ""}
                      onChange={(e) => updateRole(activeRoleData.id, 'notes', e.target.value)}
                      placeholder="Special instructions, requirements, or details for this role..."
                      rows={3}
                      className="text-base resize-none border-2 border-white/10 rounded-xl"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      className="w-full h-12 text-base text-red-400 hover:text-red-300 hover:bg-red-400/10 font-medium"
                      onClick={() => {
                        removeRole(activeRoleData.id);
                        setEditingRoleId(null);
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
              className="w-full h-14 text-lg font-bold bg-gold-400 hover:bg-gold-300 text-navy-800 shadow-xl rounded-xl touch-manipulation"
              onClick={() => setEditingRoleId(null)}
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
