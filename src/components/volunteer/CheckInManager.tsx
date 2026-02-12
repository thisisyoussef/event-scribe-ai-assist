import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useVolunteerCheckIn } from '@/hooks/useVolunteerCheckIn';
import { supabase } from '@/integrations/supabase/client';
import { Volunteer, VolunteerRole } from '@/types/database';
import { CheckCircle, Clock, Users, Search, LogIn, LogOut, AlertTriangle, FileText } from 'lucide-react';
import { formatTimeInMichigan } from '@/utils/timezoneUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CheckInManagerProps {
  eventId: string;
  volunteers: Volunteer[];
  volunteerRoles: VolunteerRole[];
  onVolunteerUpdate: (updatedVolunteer: Volunteer) => void;
}

interface CheckInDialogProps {
  volunteer: Volunteer;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: (volunteerId: string, notes?: string) => void;
  onCheckOut: (volunteerId: string, notes?: string) => void;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
}

const CheckInDialog: React.FC<CheckInDialogProps> = ({
  volunteer,
  isOpen,
  onClose,
  onCheckIn,
  onCheckOut,
  isCheckingIn,
  isCheckingOut
}) => {
  const [notes, setNotes] = useState(volunteer.check_in_notes || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const isCheckedIn = !!volunteer.checked_in_at;
  const isCheckedOut = !!volunteer.checked_out_at;

  // Reset notes when volunteer changes
  useEffect(() => {
    setNotes(volunteer.check_in_notes || '');
  }, [volunteer.id, volunteer.check_in_notes]);

  // Move cursor to end when dialog opens and notes exist
  useEffect(() => {
    if (isOpen && textareaRef.current && notes.length > 0) {
      // Small delay to ensure textarea is rendered
      setTimeout(() => {
        if (textareaRef.current) {
          // Add space at end if text doesn't already end with a space
          if (!notes.endsWith(' ')) {
            const updatedNotes = notes + ' ';
            setNotes(updatedNotes);
            textareaRef.current.setSelectionRange(updatedNotes.length, updatedNotes.length);
          } else {
            textareaRef.current.setSelectionRange(notes.length, notes.length);
          }
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]); // Only depend on isOpen to avoid infinite loop

  const handleFocus = () => {
    if (textareaRef.current && notes.length > 0) {
      // Add space at end if text doesn't already end with a space
      if (!notes.endsWith(' ')) {
        const updatedNotes = notes + ' ';
        setNotes(updatedNotes);
        // Small delay to ensure state update is reflected
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(updatedNotes.length, updatedNotes.length);
          }
        }, 0);
      } else {
        textareaRef.current.setSelectionRange(notes.length, notes.length);
      }
    }
  };

  const handleSubmit = () => {
    if (isCheckedIn && !isCheckedOut) {
      onCheckOut(volunteer.id, notes);
    } else if (!isCheckedIn) {
      onCheckIn(volunteer.id, notes);
    }
    setNotes('');
  };

  const scrollTextareaIntoView = () => {
    if (textareaRef.current) {
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          // Find the scrollable parent container
          const scrollContainer = textarea.closest('.overflow-y-auto');
          if (scrollContainer) {
            const textareaTop = textarea.offsetTop;
            const textareaHeight = textarea.offsetHeight;
            const containerHeight = scrollContainer.clientHeight;
            const scrollTop = scrollContainer.scrollTop;
            
            // Calculate desired scroll position to center textarea in visible area
            const desiredScrollTop = textareaTop - (containerHeight / 2) + (textareaHeight / 2);
            scrollContainer.scrollTo({
              top: Math.max(0, desiredScrollTop),
              behavior: 'smooth'
            });
          } else {
            // Fallback to scrollIntoView if no scroll container found
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 350); // Delay to allow keyboard to appear
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        ${isMobile 
          ? 'w-[95vw] max-w-[95vw] max-h-[60vh] top-[8vh] translate-x-[-50%] translate-y-0 p-4 rounded-xl' 
          : 'sm:max-w-md max-h-[85vh]'
        } 
        flex flex-col overflow-hidden bg-[#faf7f2] border-[#e9e5dd] shadow-xl
      `}>
        <DialogHeader className={`flex-shrink-0 ${isMobile ? 'pb-2' : ''}`}>
          <DialogTitle className={isMobile ? 'text-base' : ''}>
            {isCheckedIn && !isCheckedOut ? 'Check Out Volunteer' : 'Check In Volunteer'}
          </DialogTitle>
          {!isMobile && (
            <DialogDescription>
              {isCheckedIn && !isCheckedOut 
                ? `Check out ${volunteer.name} from their volunteer role.`
                : `Check in ${volunteer.name} for their volunteer role.`
              }
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className={`space-y-3 flex-1 overflow-y-auto pr-1 ${isMobile ? 'pb-2' : 'pb-4'}`}>
          <div>
            <Label htmlFor="volunteer-name">Volunteer Name</Label>
            <Input
              id="volunteer-name"
              value={volunteer.name}
              disabled
              className="bg-background"
            />
          </div>

          <div>
            <Label htmlFor="volunteer-phone">Phone</Label>
            <Input
              id="volunteer-phone"
              value={volunteer.phone}
              disabled
              className="bg-background"
            />
          </div>

          <div>
            <Label htmlFor="notes" className={isMobile ? 'text-sm' : ''}>Notes (Optional)</Label>
            <Textarea
              ref={textareaRef}
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={(e) => {
                handleFocus();
                scrollTextareaIntoView();
              }}
              placeholder="e.g., 'Running late', 'Left early', 'Special instructions'..."
              rows={isMobile ? 2 : 3}
              autoComplete="off"
              className="resize-none text-sm"
            />
          </div>
        </div>

        <div className={`flex justify-end space-x-2 flex-shrink-0 ${isMobile ? 'pt-2 pb-1' : 'pt-2 border-t'}`}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCheckingIn || isCheckingOut}
              className={isCheckedIn && !isCheckedOut ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isCheckingIn || isCheckingOut ? (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              ) : isCheckedIn && !isCheckedOut ? (
                <LogOut className="w-4 h-4 mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {isCheckedIn && !isCheckedOut ? 'Check Out' : 'Check In'}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface NotesDialogProps {
  volunteer: Volunteer;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNotes: () => void;
  notes: string;
  setNotes: (notes: string) => void;
}

const NotesDialog: React.FC<NotesDialogProps> = ({
  volunteer,
  isOpen,
  onClose,
  onUpdateNotes,
  notes,
  setNotes
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Move cursor to end when dialog opens and notes exist
  useEffect(() => {
    if (isOpen && textareaRef.current && notes.length > 0) {
      // Small delay to ensure textarea is rendered
      setTimeout(() => {
        if (textareaRef.current) {
          // Add space at end if text doesn't already end with a space
          if (!notes.endsWith(' ')) {
            const updatedNotes = notes + ' ';
            setNotes(updatedNotes);
            textareaRef.current.setSelectionRange(updatedNotes.length, updatedNotes.length);
          } else {
            textareaRef.current.setSelectionRange(notes.length, notes.length);
          }
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]); // Only depend on isOpen to avoid infinite loop

  const handleFocus = () => {
    if (textareaRef.current && notes.length > 0) {
      // Add space at end if text doesn't already end with a space
      if (!notes.endsWith(' ')) {
        const updatedNotes = notes + ' ';
        setNotes(updatedNotes);
        // Small delay to ensure state update is reflected
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(updatedNotes.length, updatedNotes.length);
          }
        }, 0);
      } else {
        textareaRef.current.setSelectionRange(notes.length, notes.length);
      }
    }
  };

  const scrollTextareaIntoView = () => {
    if (textareaRef.current) {
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          // Find the scrollable parent container
          const scrollContainer = textarea.closest('.overflow-y-auto');
          if (scrollContainer) {
            const textareaTop = textarea.offsetTop;
            const textareaHeight = textarea.offsetHeight;
            const containerHeight = scrollContainer.clientHeight;
            const scrollTop = scrollContainer.scrollTop;
            
            // Calculate desired scroll position to center textarea in visible area
            const desiredScrollTop = textareaTop - (containerHeight / 2) + (textareaHeight / 2);
            scrollContainer.scrollTo({
              top: Math.max(0, desiredScrollTop),
              behavior: 'smooth'
            });
          } else {
            // Fallback to scrollIntoView if no scroll container found
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 350); // Delay to allow keyboard to appear
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        ${isMobile 
          ? 'w-[95vw] max-w-[95vw] max-h-[60vh] top-[8vh] translate-x-[-50%] translate-y-0 p-4 rounded-xl' 
          : 'sm:max-w-md max-h-[85vh]'
        } 
        flex flex-col overflow-hidden bg-[#faf7f2] border-[#e9e5dd] shadow-xl
      `}>
        <DialogHeader className={`flex-shrink-0 ${isMobile ? 'pb-2' : ''}`}>
          <DialogTitle className={isMobile ? 'text-base' : ''}>Add Notes for {volunteer.name}</DialogTitle>
          {!isMobile && (
            <DialogDescription>
              Add or edit notes about this volunteer's check-in status.
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-3' : 'pb-4'}`}>
          <div className="px-1">
            <Label htmlFor="notes" className={isMobile ? 'text-sm mb-2 block' : 'mb-2 block'}>Notes</Label>
            <Textarea
              ref={textareaRef}
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={(e) => {
                handleFocus();
                scrollTextareaIntoView();
              }}
              placeholder="e.g., 'Running late', 'Left early', 'Special instructions'..."
              rows={isMobile ? 4 : 5}
              className="resize-none text-[15px] rounded-2xl border border-[#e6e2d8] px-4 py-3 bg-white/95 shadow-[inset_0_1px_0_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.04)] focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 focus:ring-offset-0"
            />
          </div>
        </div>

        {!isMobile && (
          <div className="flex justify-end space-x-2 flex-shrink-0 pt-4 border-t border-[#e9e5dd]">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onUpdateNotes} className="bg-gold-400 hover:bg-gold-300">
              Save Notes
            </Button>
          </div>
        )}

        {isMobile && (
          <div className="flex-shrink-0 pt-3 pb-1">
            <Button
              onClick={onUpdateNotes}
              className="w-full bg-gold-400 hover:bg-gold-300 text-white rounded-full px-6 py-3.5 shadow-xl font-medium text-[15px]"
            >
              Save Notes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CheckInManager: React.FC<CheckInManagerProps> = ({
  eventId,
  volunteers,
  volunteerRoles,
  onVolunteerUpdate
}) => {
  const { toast } = useToast();
  const { checkInVolunteer, checkOutVolunteer } = useVolunteerCheckIn();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not-in' | 'in'>('all');

  // Use refs to access latest values in subscription callback without causing re-subscriptions
  const volunteersRef = useRef(volunteers);
  const onVolunteerUpdateRef = useRef(onVolunteerUpdate);

  // Keep refs updated
  useEffect(() => {
    volunteersRef.current = volunteers;
    onVolunteerUpdateRef.current = onVolunteerUpdate;
  }, [volunteers, onVolunteerUpdate]);

  // Real-time subscription for volunteer updates
  useEffect(() => {
    if (!eventId) return;

    console.log('Setting up real-time subscription for event:', eventId);

    const channel = supabase
      .channel(`volunteer-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'volunteers',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Extract the updated volunteer data
          const updatedVolunteer = payload.new as Volunteer;
          
          // Use refs to access latest values
          const currentVolunteers = volunteersRef.current;
          const updateHandler = onVolunteerUpdateRef.current;
          
          // Check if this volunteer exists in the current list
          const existingVolunteer = currentVolunteers.find(v => v.id === updatedVolunteer.id);
          
          if (existingVolunteer) {
            // Only update if the check-in related fields changed to avoid unnecessary updates
            const checkInFieldsChanged = 
              existingVolunteer.checked_in_at !== updatedVolunteer.checked_in_at ||
              existingVolunteer.checked_out_at !== updatedVolunteer.checked_out_at ||
              existingVolunteer.check_in_notes !== updatedVolunteer.check_in_notes;

            if (checkInFieldsChanged) {
              console.log('Updating volunteer from real-time subscription:', updatedVolunteer);
              updateHandler(updatedVolunteer);
            }
          } else {
            // Volunteer might have been added, but we'll handle that via the parent component's data reload
            console.log('Volunteer not found in current list, update ignored');
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to volunteer updates for event:', eventId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to volunteer updates');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Real-time subscription timed out, retrying...');
        } else if (status === 'CLOSED') {
          console.log('Real-time subscription closed');
        }
      });

    // Cleanup subscription on unmount or when eventId changes
    return () => {
      console.log('Cleaning up real-time subscription for event:', eventId);
      supabase.removeChannel(channel);
    };
  }, [eventId]); // Only depend on eventId to avoid unnecessary re-subscriptions

  // Get role information for a volunteer
  const getRoleInfo = (volunteer: Volunteer) => {
    return volunteerRoles.find(role => role.id === volunteer.role_id);
  };

  // Check if a role has the searched POC name (searches all POCs attached to the role)
  const roleHasPOC = (role: VolunteerRole | undefined, searchTerm: string): boolean => {
    if (!role || !searchTerm) return false;
    
    // searchTerm should already be lowercased and trimmed from the filter, but we'll do it again to be safe
    const query = searchTerm.toLowerCase().trim();
    if (!query) return false;
    
    // Check poc_contacts array (primary source - populated contact objects)
    if (role.poc_contacts && Array.isArray(role.poc_contacts)) {
      if (role.poc_contacts.some(poc => {
        if (!poc) return false;
        // Search by name
        if (poc.name?.toLowerCase().includes(query)) return true;
        // Search by email
        if (poc.email?.toLowerCase().includes(query)) return true;
        // Search by phone (remove formatting)
        if (poc.phone?.replace(/\D/g, '').includes(query.replace(/\D/g, ''))) return true;
        return false;
      })) {
        return true;
      }
    }
    
    // Check poc_contact single object (legacy field)
    if (role.poc_contact) {
      if (role.poc_contact.name?.toLowerCase().includes(query)) return true;
      if (role.poc_contact.email?.toLowerCase().includes(query)) return true;
      if (role.poc_contact.phone?.replace(/\D/g, '').includes(query.replace(/\D/g, ''))) return true;
    }
    
    // Check suggested_poc (can be string or string[] of names/IDs)
    // Note: This might contain IDs, but we check it anyway in case it has names
    if (role.suggested_poc) {
      if (Array.isArray(role.suggested_poc)) {
        if (role.suggested_poc.some(poc => {
          if (!poc) return false;
          // If it's a name string, check it
          if (typeof poc === 'string' && poc.toLowerCase().includes(query)) return true;
          return false;
        })) {
          return true;
        }
      } else if (typeof role.suggested_poc === 'string') {
        if (role.suggested_poc.toLowerCase().includes(query)) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Build a robust searchable text for a volunteer (name, phone, role, POCs)
  const buildVolunteerSearchText = (volunteer: Volunteer): string => {
    const parts: string[] = [];
    // Volunteer basics
    parts.push(volunteer.name || '');
    parts.push(volunteer.phone || '');
    const normalizedVolunteerPhone = (volunteer.phone || '').replace(/\D/g, '');
    if (normalizedVolunteerPhone) parts.push(normalizedVolunteerPhone);

    // Role info
    const roleInfo = getRoleInfo(volunteer);
    if (roleInfo?.role_label) parts.push(roleInfo.role_label);

    // POC info
    const pushPoc = (p: any) => {
      if (!p) return;
      if (p.name) parts.push(p.name);
      if (p.email) parts.push(p.email);
      if (p.phone) {
        parts.push(p.phone);
        const normalized = String(p.phone).replace(/\D/g, '');
        if (normalized) parts.push(normalized);
      }
    };
    if (roleInfo?.poc_contacts && Array.isArray(roleInfo.poc_contacts)) {
      roleInfo.poc_contacts.forEach(pushPoc);
    }
    if (roleInfo?.poc_contact) pushPoc(roleInfo.poc_contact);

    // Fallback: if suggested_poc is a string/string[] that might contain names (legacy)
    const suggested: any = (roleInfo as any)?.suggested_poc;
    if (suggested) {
      if (Array.isArray(suggested)) {
        suggested.forEach((s) => parts.push(String(s)));
      } else {
        parts.push(String(suggested));
      }
    }

    // Normalize: lowercase and collapse whitespace
    return parts
      .filter(Boolean)
      .join(' ') 
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Filter volunteers based on search query (including role and POC)
  const filteredVolunteers = volunteers
    .filter(volunteer => {
      if (!searchQuery || !searchQuery.trim()) return true;

      const rawQuery = searchQuery.trim();
      const qLower = rawQuery.toLowerCase();
      const qDigits = rawQuery.replace(/\D/g, '');

      const haystack = buildVolunteerSearchText(volunteer);

      // Match by text or by digits (for phone searches)
      if (haystack.includes(qLower)) return true;
      if (qDigits && haystack.includes(qDigits)) return true;

      return false;
    })
    .filter(v => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'in') return !!v.checked_in_at && !v.checked_out_at;
      return !v.checked_in_at || !!v.checked_out_at;
    });


  // Open check-in dialog for a volunteer
  const openCheckInDialog = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setNotes(volunteer.check_in_notes || '');
    setIsDialogOpen(true);
  };

  const openNotesDialog = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setNotes(volunteer.check_in_notes || '');
    setIsDialogOpen(true);
  };

  const handleUpdateNotes = async () => {
    if (!selectedVolunteer) return;
    
    try {
      // Update notes via secure RPC (respects POC/shared access)
      const { error } = await supabase
        .rpc('update_volunteer_checkin_status', {
          p_volunteer_id: selectedVolunteer.id,
          p_action: 'notes',
          p_notes: notes || null,
        });

      if (error) throw error;

      // Update local state
      const updatedVolunteer = {
        ...selectedVolunteer,
        check_in_notes: notes || null
      };
      
      onVolunteerUpdate(updatedVolunteer);
      
      toast({
        title: "Notes Updated",
        description: "Volunteer notes have been updated successfully.",
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Error",
        description: "Failed to update notes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckIn = async (volunteerId: string) => {
    setIsCheckingIn(true);
    try {
      const ok = await checkInVolunteer(volunteerId);
      if (!ok) {
        // Error toast is already shown in hook
        return;
      }
      
      // Update local state
      const updatedVolunteer = volunteers.find(v => v.id === volunteerId);
      if (updatedVolunteer) {
        onVolunteerUpdate({
          ...updatedVolunteer,
          checked_in_at: new Date().toISOString(),
          checked_out_at: null
        });
      }

      toast({
        title: "Success",
        description: "Volunteer checked in successfully!",
      });
    } catch (error) {
      console.error('Error checking in volunteer:', error);
      toast({
        title: "Error",
        description: "Failed to check in volunteer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async (volunteerId: string) => {
    setIsCheckingOut(true);
    try {
      const ok = await checkOutVolunteer(volunteerId);
      if (!ok) {
        // Error toast is already shown in hook
        return;
      }
      
      // Update local state
      const updatedVolunteer = volunteers.find(v => v.id === volunteerId);
      if (updatedVolunteer) {
        onVolunteerUpdate({
          ...updatedVolunteer,
          checked_out_at: new Date().toISOString()
        });
      }

      toast({
        title: "Success",
        description: "Volunteer checked out successfully!",
      });
    } catch (error) {
      console.error('Error checking out volunteer:', error);
      toast({
        title: "Error",
        description: "Failed to check out volunteer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleRunningLate = async (volunteer: Volunteer) => {
    setIsCheckingIn(true);
    try {
      const notes = 'Running late';
      // Update via secure RPC, do not check them in
      const { error } = await supabase
        .rpc('update_volunteer_checkin_status', {
          p_volunteer_id: volunteer.id,
          p_action: 'running_late',
          p_notes: notes,
        });

      if (error) throw error;
      
      // Get the latest volunteer data from props to ensure we're working with current state
      const currentVolunteer = volunteers.find(v => v.id === volunteer.id) || volunteer;
      
      // Update local state - don't set checked_in_at
      const updatedVolunteer: Volunteer = {
        ...currentVolunteer,
        check_in_notes: notes,
        checked_in_at: null, // Explicitly ensure it's null
      };
      
      onVolunteerUpdate(updatedVolunteer);
      
      toast({
        title: "Status Updated",
        description: `${volunteer.name} has been marked as running late.`,
      });
    } catch (error) {
      console.error('Error updating running late status:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Get check-in status badge from local state
  const getCheckInStatus = (volunteer: Volunteer) => {
    // If checked in, show as checked in (highest priority)
    if (volunteer.checked_in_at && !volunteer.checked_out_at) {
      return { status: 'checked-in', label: 'Checked In', variant: 'default' as const };
    }
    // If not checked in, but marked as running late, show as running late
    // Check this BEFORE defaulting to "Not Checked In"
    const notes = volunteer.check_in_notes?.trim().toLowerCase() || '';
    if (!volunteer.checked_in_at && notes.includes('running late')) {
      return { status: 'running-late', label: 'Running Late', variant: 'warning' as const };
    }
    // Otherwise, if not checked in and not running late, it's not checked in
    return { status: 'not-checked-in', label: 'Not Checked In', variant: 'destructive' as const };
  };

  // Statistics - based on current state, not historical
  const totalVolunteers = volunteers.length;
  const checkedInCount = volunteers.filter(v => v.checked_in_at && !v.checked_out_at).length;
  const checkedOutCount = volunteers.filter(v => v.checked_out_at && !v.checked_in_at).length;
  const notCheckedInCount = totalVolunteers - checkedInCount - checkedOutCount;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search and Filter */}
      <div className="frosted-panel p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 sm:w-5 sm:h-5 z-10" />
            {/* iOS Passwords bar trap: offscreen username/password fields so Safari doesn't suggest passwords for the search input */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
            >
              <input tabIndex={-1} type="text" autoComplete="username" name="trap_username" />
              <input tabIndex={-1} type="password" autoComplete="current-password" name="trap_password" />
            </div>
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 h-9 sm:h-10 rounded-xl bg-white/70 backdrop-blur-md border-umma-500 text-sm w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="search"
              enterKeyHint="search"
              name="roster_search"
              data-lpignore="true"
              data-1p-ignore
            />
          </div>

          {/* Combined Statistics and Filter Buttons */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-md p-1 ring-1 ring-white/60 w-full sm:w-auto justify-center sm:justify-start shrink-0">
          <Button variant={statusFilter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('all')} className={`rounded-full text-xs sm:text-sm px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 ${statusFilter==='all' ? 'bg-umma-600 text-white hover:bg-umma-700 shadow-sm' : 'text-stone-700 hover:bg-stone-100/80'}`}>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="font-semibold">{totalVolunteers}</span>
            <span>Total</span>
          </Button>
          <Button variant={statusFilter === 'not-in' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('not-in')} className={`rounded-full text-xs sm:text-sm px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 ${statusFilter==='not-in' ? 'bg-umma-600 text-white hover:bg-umma-700 shadow-sm' : 'text-stone-700 hover:bg-stone-100/80'}`}>
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="font-semibold">{notCheckedInCount}</span>
            <span>Not In</span>
          </Button>
          <Button variant={statusFilter === 'in' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('in')} className={`rounded-full text-xs sm:text-sm px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 ${statusFilter==='in' ? 'bg-umma-600 text-white hover:bg-umma-700 shadow-sm' : 'text-stone-700 hover:bg-stone-100/80'}`}>
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="font-semibold">{checkedInCount}</span>
            <span>Checked In</span>
          </Button>
          </div>
        </div>

        {/* Volunteers List (clean, Apple-style) */}
        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
            {filteredVolunteers.map((volunteer) => {
              const roleInfo = getRoleInfo(volunteer);
              const checkInStatus = getCheckInStatus(volunteer);
              const isIn = !!volunteer.checked_in_at && !volunteer.checked_out_at;
              const isRunningLate = checkInStatus.status === 'running-late';
              return (
              <div key={volunteer.id} className={`relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl backdrop-blur-md border transition-all duration-150 ${
                isIn 
                  ? 'bg-umma-600 border-umma-600 text-white hover:border-umma-700' 
                  : isRunningLate
                  ? 'bg-amber-50/60 border-amber-300/60 hover:bg-amber-100/70'
                  : 'bg-white/70 border-umma-500 hover:bg-white/80'
              }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-medium bg-white text-umma-700">{getInitials(volunteer.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                    <div className={`font-medium text-sm sm:text-base truncate flex items-center gap-1.5 sm:gap-2 flex-wrap ${isIn ? 'text-white' : 'text-stone-900'}`}>
                      {volunteer.name}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(volunteer.phone);
                          toast({
                            title: "Phone number copied!",
                            description: `${volunteer.name}'s phone number copied to clipboard`,
                          });
                        }}
                        className={`${isIn ? 'text-white/90 hover:text-white' : 'text-umma-700 hover:text-umma-800'} text-xs sm:text-sm font-medium cursor-pointer no-underline`}
                        title={`Click to copy ${volunteer.name}'s phone number`}
                      >
                        {volunteer.phone}
                      </button>
                    </div>
                    <div className={`text-xs truncate ${isIn ? 'text-white/80' : 'text-stone-500'}`}>
                        {roleInfo?.role_label || 'Unknown Role'}
                      </div>
                    </div>
                  </div>

                  <div className="sm:ml-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">

                    <div className="flex items-center gap-2 flex-wrap">
                      {checkInStatus.status !== 'not-checked-in' && (
                        <span className={`${
                          checkInStatus.status === 'checked-in' 
                            ? 'rounded-full px-3 py-1 text-xs font-medium shadow-sm transition-all duration-200 bg-white text-umma-700 border border-umma-300' 
                            : checkInStatus.status === 'running-late' 
                            ? 'warning-pill' 
                            : 'danger-pill'
                        } flex items-center gap-1.5`}>
                          {checkInStatus.status === 'running-late' && (
                            <Clock className="w-3 h-3" />
                          )}
                          {checkInStatus.label}
                        </span>
                      )}
                      {isIn && volunteer.checked_in_at && (
                        <span className={`text-xs sm:text-sm ${isIn ? 'text-white/80' : 'text-stone-500'}`}>{formatTimeInMichigan(volunteer.checked_in_at)}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap w-full sm:w-auto">
                      {!isIn ? (
                        <>
                          <Button size="sm" className="flex-1 sm:flex-none rounded-full shadow-[0_1px_0_rgba(0,0,0,0.04)] text-xs sm:text-sm justify-center" onClick={() => handleCheckIn(volunteer.id)} disabled={isCheckingIn || isCheckingOut}>
                            <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Check In</span>
                            <span className="sm:hidden">In</span>
                          </Button>
                          {checkInStatus.status !== 'running-late' && (
                            <Button size="sm" variant="outline" onClick={() => handleRunningLate(volunteer)} disabled={isCheckingIn || isCheckingOut} className="flex-1 sm:flex-none rounded-full text-amber-700 border-amber-300 hover:bg-amber-50 text-xs sm:text-sm justify-center">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Running Late</span>
                              <span className="sm:hidden">Late</span>
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleCheckOut(volunteer.id)} disabled={isCheckingIn || isCheckingOut} className="flex-1 sm:flex-none rounded-full text-xs sm:text-sm justify-center">
                          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Check Out</span>
                          <span className="sm:hidden">Out</span>
                        </Button>
                      )}

                      <div className="relative flex-1 sm:flex-none">
                        <Button 
                          variant="outline"
                          size="sm" 
                          onClick={() => openNotesDialog(volunteer)} 
                          className={`w-full sm:w-auto rounded-full text-xs sm:text-sm justify-center ${
                            volunteer.check_in_notes 
                              ? 'bg-umma-100 border-umma-300 text-umma-800 hover:bg-umma-200 hover:border-umma-400 shadow-sm font-medium' 
                              : 'bg-white border-umma-200 text-umma-700 hover:bg-umma-50 hover:border-umma-300'
                          }`}
                        >
                          <FileText className={`w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1 ${volunteer.check_in_notes ? 'text-umma-800' : 'text-umma-700'}`} />
                          <span className="hidden sm:inline">Notes</span>
                          <span className="sm:hidden">Notes</span>
                        </Button>
                        {volunteer.check_in_notes && (
                          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-umma-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">!</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredVolunteers.length === 0 && (
            <div className="text-center py-8 text-white/40">
              {searchQuery && searchQuery.trim() 
                ? "No volunteers found matching your search."
                : "No volunteers found."}
            </div>
          )}
      </div>

      {/* Notes Dialog */}
      {selectedVolunteer && (
        <NotesDialog
          volunteer={selectedVolunteer}
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedVolunteer(null);
          }}
          onUpdateNotes={handleUpdateNotes}
          notes={notes}
          setNotes={setNotes}
        />
      )}
    </div>
  );
};

export default CheckInManager;

