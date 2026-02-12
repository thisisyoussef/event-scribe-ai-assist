
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CustomSelect } from "@/components/ui/custom-select";
import Navigation from "@/components/Navigation";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Upload, 
  Download, 
  Filter, 
  Users, 
  Phone, 
  Mail, 
  X 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/database";

// Extended contact interface with volunteer signup history
interface ContactWithDetails extends Contact {
  total_events_volunteered?: number;
  total_roles_volunteered?: number;
  total_poc_assignments?: number;
  volunteerHistory: Array<{
    event: { id: string; title: string; start_datetime: string } | null;
    role: { id: string; role_label: string } | null;
    signup_date: string;
    status: string;
  }>;
}

const Contacts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [contacts, setContacts] = useState<ContactWithDetails[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", phone: "", email: "", gender: "" as 'brother' | 'sister' | '', contactType: "" as 'poc' | 'volunteer' | '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'poc' | 'volunteer'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'brother' | 'sister'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [availableEvents, setAvailableEvents] = useState<Array<{id: string, title: string}>>([]);
  const [availableRoles, setAvailableRoles] = useState<Array<{id: string, role_label: string, event_id: string}>>([]);
  const [filteredRoles, setFilteredRoles] = useState<Array<{id: string, role_label: string, event_id: string}>>([]);
  const [filteredEvents, setFilteredEvents] = useState<Array<{id: string, title: string}>>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'roles_desc' | 'roles_asc' | 'attendance_desc' | 'attendance_asc'>('recent');

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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      await loadContacts(user.id);
      await loadAvailableEventsAndRoles(user.id);
    };

    checkUser();
  }, [navigate]);

  const loadContacts = async (userId: string) => {
    try {
      setLoading(true);
      // Fetch ALL contacts since the table is now public
      const { data: contactRows, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (contactsError) {
        console.error('Error loading contacts:', contactsError);
        toast({
          title: "Error",
          description: "Failed to load contacts.",
          variant: "destructive",
        });
        return;
      }

      const rows = contactRows || [];

      // Fetch active (non-deleted) events to scope POC counting
      const { data: activeEvents } = await supabase
        .from('events')
        .select('id')
        .is('deleted_at', null);
      const activeEventIds = new Set((activeEvents || []).map(e => e.id));

      // Fetch all volunteer roles to compute POC counts
      const { data: rolesForPoc } = await supabase
        .from('volunteer_roles')
        .select('event_id, suggested_poc');

      // Build a contactId -> poc count map (only roles in active events)
      const contactIdToPocCount = new Map<string, number>();
      (rolesForPoc || []).forEach((role: any) => {
        if (!activeEventIds.has(role.event_id)) return;
        const pocArray: string[] = Array.isArray(role.suggested_poc)
          ? role.suggested_poc
          : (role.suggested_poc ? [role.suggested_poc] : []);
        pocArray.forEach((contactId) => {
          if (!contactId) return;
          contactIdToPocCount.set(
            contactId,
            (contactIdToPocCount.get(contactId) || 0) + 1
          );
        });
      });

      // Load volunteer signup history for contacts
      const contactsWithDetails = await Promise.all(
        rows.map(async (contact: any) => {
          let volunteerHistory: Array<{
            event: { id: string; title: string; start_datetime: string } | null;
            role: { id: string; role_label: string } | null;
            signup_date: string;
            status: string;
          }> = [];

          // Load volunteer signup history for ALL contacts (not just those with source === 'volunteer_signup')
          console.log('Loading volunteer signups for contact:', contact.id, 'with source:', contact.source);
          
          try {
            // Get volunteer signups via RPC that normalizes phone on the server
            const { data: signups, error: signupsError } = await supabase
              .rpc('get_volunteer_signups_by_phone', { p_phone: contact.phone });

            if (signupsError) {
              console.error('Error loading volunteers for contact:', contact.id, signupsError);
            } else if (signups && signups.length > 0) {
              console.log('Found volunteer signups for contact:', contact.id, signups);
              
              // Load event and role details for each signup (only for non-deleted events/roles)
              const signupDetails = await Promise.all(
                signups.map(async (signup) => {
                  try {
                    const { data: event, error: eventError } = await supabase
                      .from('events')
                      .select('id, title, start_datetime')
                      .eq('id', signup.event_id)
                      .is('deleted_at', null)
                      .maybeSingle();

                    if (eventError) {
                      console.error('Error loading event for signup:', eventError);
                      return null;
                    }

                    const { data: role, error: roleError } = await supabase
                      .from('volunteer_roles')
                      .select('id, role_label')
                      .eq('id', signup.role_id)
                      .maybeSingle();

                    if (roleError) {
                      console.error('Error loading role for signup:', roleError);
                      return null;
                    }

                    // Only include signups with valid (non-deleted) events and roles
                    if (event && role) {
                      return {
                        event,
                        role,
                        signup_date: signup.signup_date || '',
                        status: signup.status || 'confirmed',
                      };
                    }
                    return null;
                  } catch (error) {
                    console.error('Error loading signup details:', error);
                    return null;
                  }
                })
              );

              // Filter out null entries (deleted events/roles)
              volunteerHistory = signupDetails.filter(signup => signup !== null);
            } else {
              console.log('No volunteer signups found for contact:', contact.id);
            }
          } catch (error) {
            console.error('Exception while loading volunteer signups:', error);
            console.log('This might mean the volunteer_signups table doesn\'t exist yet');
          }

          // Compute total events volunteered (distinct confirmed event_ids)
          const totalEventsVolunteered = (() => {
            const confirmed = volunteerHistory.filter(v => (v.status || 'confirmed') === 'confirmed');
            const distinctEventIds = new Set(
              confirmed
                .map(v => v.event?.id)
                .filter((id): id is string => Boolean(id))
            );
            return distinctEventIds.size;
          })();

          // Compute total roles volunteered (confirmed signups count)
          const totalRolesVolunteered = (() => {
            const confirmed = volunteerHistory.filter(v => (v.status || 'confirmed') === 'confirmed');
            return confirmed.length;
          })();

          // Compute total POC assignments from prebuilt map
          const totalPocAssignments = contactIdToPocCount.get(contact.id) || 0;

          return {
            ...contact,
            source: contact.source as 'manual' | 'volunteer_signup' | 'account_signup',
            volunteerHistory: volunteerHistory.length > 0 ? volunteerHistory : [],
            total_events_volunteered: totalEventsVolunteered,
            total_roles_volunteered: totalRolesVolunteered,
            total_poc_assignments: totalPocAssignments,
          } as ContactWithDetails;
        })
      );

      setContacts(contactsWithDetails);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableEventsAndRoles = async (_userId: string) => {
    try {
      // Load available events for filtering (exclude deleted events)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .is('deleted_at', null)
        .order('title');

      if (eventsError) {
        console.error('Error loading events for filtering:', eventsError);
      } else {
        setAvailableEvents(events || []);
        setFilteredEvents(events || []); // Initially show all events
      }

      // Load available roles for filtering (only for non-deleted events)
      const { data: roles, error: rolesError } = await supabase
        .from('volunteer_roles')
        .select('id, role_label, event_id')
        .in('event_id', events?.map(e => e.id) || [])
        .order('role_label');

      if (rolesError) {
        console.error('Error loading roles for filtering:', rolesError);
      } else {
        setAvailableRoles(roles || []);
        setFilteredRoles(getUniqueRoles(roles || [])); // Initially show unique roles
      }
    } catch (error) {
      console.error('Error loading events and roles for filtering:', error);
    }
  };

  // Get unique roles (combine duplicates by role_label)
  const getUniqueRoles = (roles: Array<{id: string, role_label: string, event_id: string}>) => {
    const uniqueRoles = new Map<string, {id: string, role_label: string, event_id: string}>();
    
    roles.forEach(role => {
      if (!uniqueRoles.has(role.role_label)) {
        uniqueRoles.set(role.role_label, role);
      }
    });
    
    return Array.from(uniqueRoles.values());
  };

  // Filter roles based on selected event
  const updateFilteredRoles = (eventId: string) => {
    if (eventId === 'all') {
      // Show unique roles across all events
      setFilteredRoles(getUniqueRoles(availableRoles));
    } else {
      const rolesForEvent = availableRoles.filter(role => role.event_id === eventId);
      setFilteredRoles(getUniqueRoles(rolesForEvent));
    }
  };

  // Filter events based on selected role
  const updateFilteredEvents = (roleId: string) => {
    if (roleId === 'all') {
      setFilteredEvents(availableEvents);
    } else {
      const selectedRole = availableRoles.find(role => role.id === roleId);
      if (selectedRole) {
        // Find all events that have this role label by looking at ALL available roles
        const eventsWithRole = availableRoles
          .filter(role => role.role_label === selectedRole.role_label)
          .map(role => role.event_id);
        
        const eventsForRole = availableEvents.filter(event => 
          eventsWithRole.includes(event.id)
        );
        
        setFilteredEvents(eventsForRole);
      }
    }
  };

  const getFilteredContacts = () => {
    let filtered = contacts;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery) ||
        (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply source filter
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'poc') {
        filtered = filtered.filter(contact => {
          const roleVal = contact.role as ('poc' | 'volunteer' | 'admin' | undefined);
          const sourceVal = contact.source as ('manual' | 'volunteer_signup' | 'account_signup' | undefined);
          return roleVal === 'poc' || (!roleVal && (sourceVal === 'manual' || sourceVal === 'account_signup'));
        });
      } else if (sourceFilter === 'volunteer') {
        filtered = filtered.filter(contact => {
          const roleVal = contact.role as ('poc' | 'volunteer' | 'admin' | undefined);
          const sourceVal = contact.source as ('manual' | 'volunteer_signup' | 'account_signup' | undefined);
          return roleVal === 'volunteer' || (!roleVal && sourceVal === 'volunteer_signup');
        });
      }
    }
    
    // Apply gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(contact => contact.gender === genderFilter);
    }
    
    // Apply event filter
    if (eventFilter !== 'all') {
      filtered = filtered.filter(contact => 
        contact.volunteerHistory.some(signup => signup.event?.id === eventFilter)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(contact => 
        contact.volunteerHistory.some(signup => signup.role?.id === roleFilter)
      );
    }
    
    // Sorting by roles, attendance, or recency
    if (sortBy === 'roles_desc') {
      return [...filtered].sort((a, b) => {
        const diff = (b.total_roles_volunteered || 0) - (a.total_roles_volunteered || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    if (sortBy === 'roles_asc') {
      return [...filtered].sort((a, b) => {
        const diff = (a.total_roles_volunteered || 0) - (b.total_roles_volunteered || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    if (sortBy === 'attendance_desc') {
      return [...filtered].sort((a, b) => {
        const diff = (b.total_events_volunteered || 0) - (a.total_events_volunteered || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    if (sortBy === 'attendance_asc') {
      return [...filtered].sort((a, b) => {
        const diff = (a.total_events_volunteered || 0) - (b.total_events_volunteered || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    // Default: recent first
    return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setGenderFilter('all');
    setEventFilter('all');
    setRoleFilter('all');
    setFilteredRoles(getUniqueRoles(availableRoles)); // Reset to show unique roles
    setFilteredEvents(availableEvents); // Reset to show all events
  };

  // CSV Import Functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Please select a CSV file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setImportFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim()); // Handle different line endings
        
        if (lines.length < 2) {
          toast({
            title: "Invalid CSV",
            description: "CSV file must have headers and at least one data row.",
            variant: "destructive",
          });
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Validate required headers
        if (!headers.includes('Name') || !headers.includes('Phone')) {
          toast({
            title: "Missing Required Headers",
            description: "CSV must have 'Name' and 'Phone' columns.",
            variant: "destructive",
          });
          return;
        }

        // Check if Contact Type column exists, if not default to 'poc'
        const hasContactType = headers.includes('Contact Type');

        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        }).filter(row => row.Name && row.Phone); // Only include rows with required fields

        if (data.length === 0) {
          toast({
            title: "No Valid Data",
            description: "No rows found with both Name and Phone fields.",
            variant: "destructive",
          });
          return;
        }

        setImportPreview(data.slice(0, 5)); // Show first 5 rows as preview
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Parse Error",
          description: "Error reading the CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Error reading the file. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setImportLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          
          if (lines.length < 2) {
            toast({
              title: "Invalid CSV",
              description: "CSV file must have headers and at least one data row.",
              variant: "destructive",
            });
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Validate required headers
          if (!headers.includes('Name') || !headers.includes('Phone')) {
            toast({
              title: "Missing Required Headers",
              description: "CSV must have 'Name' and 'Phone' columns.",
              variant: "destructive",
            });
            return;
          }

          // Check if Contact Type column exists, if not default to 'poc'
          const hasContactType = headers.includes('Contact Type');

          const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          }).filter(row => row.Name && row.Phone); // Only include rows with required fields

          if (data.length === 0) {
            toast({
              title: "No Valid Data",
              description: "No rows found with both Name and Phone fields.",
              variant: "destructive",
            });
            return;
          }

          // Process each row
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];
          
          for (const row of data) {
            try {
              // Validate phone number format
              const phone = row.Phone.trim();
              if (!phone || phone.length < 10) {
                errors.push(`Row "${row.Name}": Invalid phone number`);
                errorCount++;
                continue;
              }

              // Validate gender if provided
              let gender: 'brother' | 'sister' | null = null;
              if (row.Gender) {
                const genderLower = row.Gender.trim().toLowerCase();
                if (genderLower === 'sister' || genderLower === 'sister') {
                  gender = 'sister';
                } else if (genderLower === 'brother' || genderLower === 'brother') {
                  gender = 'brother';
                } else {
                  errors.push(`Row "${row.Name}": Invalid gender "${row.Gender}" (use "brother" or "sister")`);
                  errorCount++;
                  continue;
                }
              }

              // Determine contact type from CSV or default to 'poc'
              let source: 'manual' | 'volunteer_signup' = 'manual';
              if (hasContactType && row['Contact Type']) {
                const contactTypeLower = row['Contact Type'].trim().toLowerCase();
                if (contactTypeLower === 'volunteer' || contactTypeLower === 'volunteer') {
                  source = 'volunteer_signup';
                } else if (contactTypeLower === 'poc' || contactTypeLower === 'point of contact') {
                  source = 'manual';
                } else {
                  errors.push(`Row "${row.Name}": Invalid contact type "${row['Contact Type']}" (use "poc" or "volunteer")`);
                  errorCount++;
                  continue;
                }
              }

              // Helper function to capitalize names
              const capitalizeName = (name: string) => {
                return name
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
              };

              const { error } = await supabase
                .from('contacts')
                .insert({
                  user_id: currentUser?.id,
                  name: capitalizeName(row.Name.trim()),  // Auto-capitalize the name
                  phone: phone,
                  email: row.Email?.trim() || null,
                  gender: gender,
                  source: source,
                  role: source === 'volunteer_signup' ? 'volunteer' : 'poc'  // Set role based on source
                });
              
              if (error) {
                console.error('Error importing row:', error, row);
                errors.push(`Row "${row.Name}": ${error.message}`);
                errorCount++;
              } else {
                successCount++;
              }
            } catch (err) {
              console.error('Error processing row:', err, row);
              errors.push(`Row "${row.Name}": Unexpected error`);
              errorCount++;
            }
          }

          // Refresh contacts
          await loadContacts(currentUser.id);
          
          // Show results
          if (successCount > 0) {
            toast({
              title: "Import Complete",
              description: `Successfully imported ${successCount} contacts${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
              variant: errorCount > 0 ? "destructive" : "default",
            });
          } else {
            toast({
              title: "Import Failed",
              description: "No contacts were imported. Please check your CSV format.",
              variant: "destructive",
            });
          }

          // Log errors for debugging
          if (errors.length > 0) {
            console.error('Import errors:', errors);
          }

          setImportDialogOpen(false);
          setImportFile(null);
          setImportPreview([]);
        } catch (error) {
          console.error('Import processing error:', error);
          toast({
            title: "Import Failed",
            description: "There was an error processing the CSV file.",
            variant: "destructive",
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: "File Read Error",
          description: "Error reading the file. Please try again.",
          variant: "destructive",
        });
      };
      reader.readAsText(importFile);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "There was an error importing the CSV file.",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
  };

  // CSV Export Functions
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const exportData = getFilteredContacts().map(contact => ({
        Name: contact.name,
        Phone: contact.phone,
        Email: contact.email || '',
        Gender: contact.gender || '',
        Source: contact.source === 'volunteer_signup' ? 'Volunteer' : 'POC',
        Event: contact.volunteerHistory.length > 0 ? contact.volunteerHistory[0].event?.title || '' : '',
        Role: contact.volunteerHistory.length > 0 ? contact.volunteerHistory[0].role?.role_label || '' : '',
        'Added Date': new Date(contact.created_at).toLocaleDateString(),
        'Last Updated': new Date(contact.updated_at).toLocaleDateString()
      }));

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} contacts to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the contacts.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };


  const validateField = (field: string, value: string) => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (value.trim().length < 10) return 'Phone number must be at least 10 digits';
        return '';
      case 'email':
        if (formData.contactType === 'poc' && !value.trim()) {
          return 'Email is required for POC contacts';
        }
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        return '';
      case 'gender':
        if (!value) return 'Please select a gender';
        return '';
      case 'contactType':
        if (!value) return 'Please select a role';
        return '';
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing/selecting
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission - current formData:', formData);
    console.log('Form submission - contactType:', formData.contactType);
    
    if (!validateForm()) {
      return;
    }

    try {
      const fullName = `${capitalize(formData.firstName.trim())} ${capitalize(formData.lastName.trim())}`.trim();
      if (editingContact) {
        // Update existing contact
        const normalizedPhone = normalizePhoneE164(formData.phone);
        const updateData = {
          name: fullName,
          phone: normalizedPhone,
          email: formData.email || null,
          gender: formData.gender || null,
          role: formData.contactType === 'volunteer' ? 'volunteer' : 'poc',
          updated_at: new Date().toISOString()
        };
        
        console.log('Updating contact with data:', updateData);
        console.log('Contact ID:', editingContact.id);
        console.log('Form contactType:', formData.contactType);
        console.log('Calculated role:', formData.contactType === 'volunteer' ? 'volunteer' : 'poc');
        console.log('Original contact data:', editingContact);
        
        const { data: updatedRows, error } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', editingContact.id)
          .select('*');

        if (error) {
          console.error('Update error:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        if (!updatedRows || updatedRows.length === 0) {
          console.error('No rows updated. Possible RLS restriction or mismatched ID.', { id: editingContact.id, updateData });
          toast({
            title: 'Update blocked',
            description: 'No changes were saved. You may not have permission to update this contact.',
            variant: 'destructive',
          });
          return;
        }

        console.log('Contact updated successfully', updatedRows[0]);
        
        // Verify the update by fetching the updated contact
        const { data: updatedContact, error: fetchError } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', editingContact.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching updated contact:', fetchError);
        } else {
          console.log('Updated contact data:', updatedContact);
        }

        toast({
          title: "Contact Updated",
          description: `${fullName} has been updated successfully.`,
        });
      } else {
        // Check if a contact with this phone number already exists
        const normalizedPhone = normalizePhoneE164(formData.phone);
        const { data: existingContact, error: checkError } = await supabase
          .from('contacts')
          .select('id, name, source')
          .eq('phone', normalizedPhone)
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
              description: `A contact with phone number ${formData.phone} already exists from a volunteer signup.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Contact Already Exists",
              description: `A contact with phone number ${formData.phone} already exists.`,
              variant: "destructive",
            });
          }
          return;
        }

        // Helper function to capitalize names
        const capitalizeName = (name: string) => {
          return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        };

        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            user_id: currentUser.id,
            name: capitalizeName(fullName),  // Auto-capitalize the name
            phone: normalizedPhone,
            email: formData.email || null,
            gender: formData.gender || null,
            source: formData.contactType === 'volunteer' ? 'volunteer_signup' : 'manual',
            role: formData.contactType === 'volunteer' ? 'volunteer' : 'poc'
          });

        if (error) throw error;

        toast({
          title: "Contact Added",
          description: `${fullName} has been added to your contacts.`,
        });
      }

      // Reload contacts
      await loadContacts(currentUser.id);
      handleDialogOpenChange(false);
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save contact.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    console.log('Editing contact:', contact);
    console.log('Contact role:', contact.role);
    console.log('Contact source:', contact.source);
    setEditingContact(contact);
    const [firstName = "", lastName = ""] = (contact.name || "").split(" ", 2);
    
    // Map the role field to contactType, with improved fallback logic
    let contactType: 'poc' | 'volunteer';
    if (contact.role) {
      // Use the role field if available
      contactType = contact.role === 'volunteer' ? 'volunteer' : 'poc';
      console.log('Using role field, contactType set to:', contactType);
    } else {
      // Fallback for legacy data - improved logic
      if (contact.source === 'volunteer_signup') {
        contactType = 'volunteer';
      } else if (contact.source === 'account_signup' || contact.source === 'manual') {
        contactType = 'poc';
      } else {
        // Default fallback - assume POC for any other source
        contactType = 'poc';
      }
      console.log('Using source field fallback, contactType set to:', contactType);
    }
    
    const formDataToSet: { firstName: string; lastName: string; phone: string; email: string; gender: 'brother' | 'sister'; contactType: 'poc' | 'volunteer' } = { 
      firstName, 
      lastName, 
      phone: contact.phone, 
      email: contact.email || "", 
      gender: (contact.gender as 'brother' | 'sister') || "brother",
      contactType
    };
    console.log('Setting form data:', formDataToSet);
    setFormData(formDataToSet);
    setIsDialogOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    try {
      const contact = contacts.find((c) => c.id === contactId);
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      await loadContacts(currentUser.id);
      
      toast({
        title: "Contact Deleted",
        description: `${contact?.name} has been removed from your contacts.`,
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    setEditingContact(null);
    setFormData({ firstName: "", lastName: "", phone: "", email: "", gender: "", contactType: "" });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Dialog is closing, reset form and editing state
      setEditingContact(null);
      setFormData({ firstName: "", lastName: "", phone: "", email: "", gender: "", contactType: "" });
      setErrors({});
    }
    setIsDialogOpen(open);
  };

  const getSourceLabel = (contact: Contact) => {
    // Use the role field if available, fallback to source field for legacy data
    if (contact.role) {
      switch (contact.role) {
        case 'poc':
          return 'POC';
        case 'volunteer':
          return 'Volunteer';
        case 'admin':
          return 'Admin';
        default:
          return 'Unknown';
      }
    }
    
    // Fallback for legacy data
    if (contact.source === 'volunteer_signup') {
      return 'Volunteer';
    }
    return 'POC Entry';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredContacts = getFilteredContacts();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
                Contacts
              </h1>
              <p className="text-white/50 text-lg leading-relaxed">
                Manage your event contacts and coordinators
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="ghost"
                className="h-10 px-4 text-white/50 hover:text-gold-300 hover:bg-white/10"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button 
                variant="ghost"
                className="h-10 px-4 text-white/50 hover:text-gold-300 hover:bg-white/10"
                onClick={handleExport}
                disabled={exportLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {exportLoading ? 'Exporting...' : 'Export'}
              </Button>
              <Button 
                onClick={openAddDialog}
                className="h-10 px-6 bg-gold-400 hover:bg-gold-300 text-navy-900 shadow-lg hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </div>

        {/* Utility Bar */}
        <div className="mb-6">
          {/* Search and Basic Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-4">Contacts</h2>
              
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-white/15 focus:border-gold-400 focus:ring-gold-400/20"
                />
              </div>
            </div>
            
            {/* Sort and More Filters */}
            <div className="flex items-center gap-3">
              <div className="w-40">
                <CustomSelect
                  options={[
                    { value: 'recent', label: 'Sort: Recent' },
                    { value: 'roles_desc', label: 'Most Active (Roles)' },
                    { value: 'attendance_desc', label: 'Most Active (Attendance)' },
                    { value: 'roles_asc', label: 'Least Active (Roles)' },
                    { value: 'attendance_asc', label: 'Least Active (Attendance)' }
                  ]}
                  value={sortBy}
                  onChange={(value) => setSortBy(value as 'recent' | 'roles_desc' | 'roles_asc' | 'attendance_desc' | 'attendance_asc')}
                  placeholder="Sort"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="text-white/50 hover:text-gold-300 hover:bg-white/10"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showMoreFilters ? 'Hide' : 'More'} Filters
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showMoreFilters && (
            <div className="mt-4 p-4 bg-background rounded-lg border border-white/10">
              <h3 className="text-sm font-medium text-white/70 mb-3">Advanced Filters</h3>
              <div className="flex flex-wrap items-center gap-4">
                {/* Source Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-white/70">Source:</Label>
                  <div className="flex bg-white/10 rounded-lg p-1">
                    {[
                      { value: 'all', label: 'All Sources' },
                      { value: 'poc', label: 'POC' },
                      { value: 'volunteer', label: 'Volunteer' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={sourceFilter === (option.value as any) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSourceFilter(option.value as 'all' | 'poc' | 'volunteer')}
                        className={`text-xs px-3 py-1 h-8 ${
                          sourceFilter === (option.value as any) 
                            ? "bg-gold-400 text-navy-900"
                            : "text-white/50 hover:text-gold-300"
                        }`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Gender Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-white/70">Gender:</Label>
                  <div className="flex bg-white/10 rounded-lg p-1">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'brother', label: 'Brother' },
                      { value: 'sister', label: 'Sister' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={genderFilter === option.value ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setGenderFilter(option.value as 'all' | 'brother' | 'sister')}
                        className={`text-xs px-3 py-1 h-8 ${
                          genderFilter === option.value 
                            ? "bg-gold-400 text-navy-900"
                            : "text-white/50 hover:text-gold-300"
                        }`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Event Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-white/70">Event:</Label>
                  <div className="w-48">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Events' },
                        ...filteredEvents.map(event => ({
                          value: event.id,
                          label: event.title
                        }))
                      ]}
                      value={eventFilter}
                      onChange={(value) => {
                        setEventFilter(value);
                        updateFilteredRoles(value);
                        // Don't reset role filter - allow both to be selected
                      }}
                      placeholder="Select an event"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-white/70">Role:</Label>
                  <div className="w-48">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Roles' },
                        ...filteredRoles.map(role => ({
                          value: role.id,
                          label: role.role_label
                        }))
                      ]}
                      value={roleFilter}
                      onChange={(value) => {
                        setRoleFilter(value);
                        updateFilteredEvents(value);
                        // Don't reset event filter - allow both to be selected
                      }}
                      placeholder={eventFilter !== 'all' ? `Roles for selected event` : "Select a role"}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
            
          {/* Clear Filters */}
          {(searchQuery || sourceFilter !== 'all' || genderFilter !== 'all' || eventFilter !== 'all' || roleFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-white/40 hover:text-white/70"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin w-12 h-12 border-3 border-gold-400 border-t-transparent rounded-full mx-auto mb-6"></div>
                <p className="text-white/70 font-medium text-lg">Loading contacts...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-16 px-8">
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-white/30" />
                </div>
                <h3 className="text-xl font-semibold text-white/70 mb-3">
                  {contacts.length === 0 ? "Start Building Your Network" : "No Contacts Match Filters"}
                </h3>
                <p className="text-white/40 mb-6 max-w-lg mx-auto">
                  {contacts.length === 0 
                    ? "Add your first contact to start building your event coordination network"
                    : "Try adjusting your search or filters to find what you're looking for."
                  }
                </p>
                {contacts.length === 0 && (
                  <Button 
                    onClick={openAddDialog}
                    className="bg-gold-400 hover:bg-gold-300 text-navy-900 px-6 py-3 shadow-lg hover:shadow-md transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Contact
                  </Button>
                )}
              </div>
            ) : (
              <>

                {/* Contacts List */}
                {isMobile ? (
                  <div className="p-4 space-y-3">
                    {filteredContacts.map((contact: ContactWithDetails) => (
                      <div key={contact.id} className="bg-white/5 rounded-xl p-4 border border-white/10 shadow-lg hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gold-400 rounded-full flex items-center justify-center text-navy-900 font-semibold">
                            {getInitials(contact.name)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{contact.name}</div>
                            <div className="text-sm text-white/50">{contact.phone}</div>
                            {contact.email && (
                              <div className="text-sm text-white/50">{contact.email}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {/* Show role based on the actual role field */}
                              {contact.role === 'poc' && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                  POC
                                </Badge>
                              )}
                              {contact.role === 'volunteer' && (
                                <Badge variant="outline" className="text-xs bg-background text-white/70 border-white/10">
                                  Volunteer
                                </Badge>
                              )}
                              {contact.role === 'admin' && (
                                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-300 border-red-200">
                                  Admin
                                </Badge>
                              )}
                              {/* Fallback for contacts without a role field (legacy data) */}
                              {!contact.role && (
                                <>
                                  {/* Show POC badge if they're a POC contact (legacy logic) */}
                                  {contact.source === 'manual' && (
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                      POC
                                    </Badge>
                                  )}
                                  {/* Show Volunteer badge if they have volunteer history OR if they were manually created as a volunteer */}
                                  {(contact.volunteerHistory.length > 0 || contact.source === 'volunteer_signup') && (
                                    <Badge variant="outline" className="text-xs bg-background text-white/70 border-white/10">
                                      Volunteer
                                    </Badge>
                                  )}
                                </>
                              )}
                              {contact.gender && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    contact.gender === 'brother' 
                                      ? 'bg-blue-500/15 text-blue-300 border-blue-200' 
                                      : 'bg-pink-50 text-pink-700 border-pink-200'
                                  }`}
                                >
                                  {contact.gender === 'brother' ? 'Brother' : 'Sister'}
                                </Badge>
                              )}
                            </div>
                            {/* Combined Activity */}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {/* Attendance (events) first */}
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-medium ${
                                  contact.total_events_volunteered && contact.total_events_volunteered > 0
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-background text-white/40 border-white/10'
                                }`}
                              >
                                {(contact.total_events_volunteered || 0)} events
                              </Badge>
                              {/* Then total roles */}
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-medium ${
                                  contact.total_roles_volunteered && contact.total_roles_volunteered > 0
                                    ? 'bg-blue-500/15 text-blue-300 border-blue-200'
                                    : 'bg-background text-white/40 border-white/10'
                                }`}
                              >
                                {(contact.total_roles_volunteered || 0)} roles
                              </Badge>
                              {(contact.role === 'poc' || (contact.total_poc_assignments || 0) > 0) && (
                                <>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-medium ${
                                      contact.total_poc_assignments && contact.total_poc_assignments > 0
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-background text-white/40 border-white/10'
                                    }`}
                                  >
                                    {(contact.total_poc_assignments || 0)} POC
                                  </Badge>
                                </>
                              )}
                            </div>
                            
                            {/* Event and Role Information */}
                            {contact.volunteerHistory.length > 0 && (
                              <div className="mt-2 text-xs text-white/40">
                                <div className="font-medium mb-1">Volunteer History:</div>
                                {contact.volunteerHistory.slice(0, 3).map((signup, index) => (
                                  <div key={index} className="ml-2">
                                    {signup.event?.title} - {signup.role?.role_label}
                                    {signup.status !== 'confirmed' && (
                                      <span className="text-white/30 ml-1">({signup.status})</span>
                                    )}
                                  </div>
                                ))}
                                {contact.volunteerHistory.length > 3 && (
                                  <div className="ml-2 text-white/30">
                                    +{contact.volunteerHistory.length - 3} more signups
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">
                            Name
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">Phone</th>
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">Email</th>
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">Gender</th>
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">Role</th>
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">Activity</th>
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">Added</th>
                          <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContacts.map((contact: ContactWithDetails) => (
                          <tr key={contact.id} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-150">
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gold-400 rounded-full flex items-center justify-center text-navy-900 font-semibold text-sm">
                                  {getInitials(contact.name)}
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{contact.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-white/30" />
                                <span className="text-white/70">{contact.phone}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2">
                                {contact.email && (
                                  <Mail className="w-4 h-4 text-white/30" />
                                )}
                                <span className="text-white/70">{contact.email || '-'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2">
                                {contact.gender && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      contact.gender === 'brother' 
                                        ? 'bg-blue-500/15 text-blue-300 border-blue-200' 
                                        : 'bg-pink-50 text-pink-700 border-pink-200'
                                    }`}
                                  >
                                    {contact.gender === 'brother' ? 'Brother' : 'Sister'}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2 gap-2">
                                {/* Show role based on the actual role field */}
                                {contact.role === 'poc' && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    POC
                                  </Badge>
                                )}
                                {contact.role === 'volunteer' && (
                                  <Badge variant="outline" className="text-xs bg-background text-white/70 border-white/10">
                                    Volunteer
                                  </Badge>
                                )}
                                {contact.role === 'admin' && (
                                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-300 border-red-200">
                                    Admin
                                  </Badge>
                                )}
                                {/* Fallback for contacts without a role field (legacy data) */}
                                {!contact.role && (
                                  <>
                                    {/* Show POC badge if they're a POC contact (legacy logic) */}
                                    {contact.source === 'manual' && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                        POC
                                      </Badge>
                                    )}
                                    {/* Show Volunteer badge if they have volunteer history OR if they were manually created as a volunteer */}
                                    {(contact.volunteerHistory.length > 0 || contact.source === 'volunteer_signup') && (
                                      <Badge variant="outline" className="text-xs bg-background text-white/70 border-white/10">
                                        Volunteer
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Attendance (events) first */}
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-medium ${
                                    contact.total_events_volunteered && contact.total_events_volunteered > 0
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-background text-white/40 border-white/10'
                                  }`}
                                >
                                  {(contact.total_events_volunteered || 0)} events
                                </Badge>
                                {/* Then total roles */}
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-medium ${
                                    contact.total_roles_volunteered && contact.total_roles_volunteered > 0
                                      ? 'bg-blue-500/15 text-blue-300 border-blue-200'
                                      : 'bg-background text-white/40 border-white/10'
                                  }`}
                                >
                                  {(contact.total_roles_volunteered || 0)} roles
                                </Badge>
                                {(contact.role === 'poc' || (contact.total_poc_assignments || 0) > 0) && (
                                  <>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs font-medium ${
                                        contact.total_poc_assignments && contact.total_poc_assignments > 0
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : 'bg-background text-white/40 border-white/10'
                                      }`}
                                    >
                                      {(contact.total_poc_assignments || 0)} POC
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm text-white/40">
                                {new Date(contact.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(contact)}
                                  title="Edit Contact"
                                  className="h-8 w-8 p-0 border-white/15 text-white/70 hover:bg-white/5"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      title="More Actions"
                                      className="h-8 w-8 p-0 border-white/15 text-white/70 hover:bg-white/5"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleDelete(contact.id)} className="text-red-400">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingContact ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact 
                ? "Update the contact information below." 
                : "Add a new contact."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    placeholder="First name"
                    className={errors.firstName ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="text-red-400 text-xs">!</span>
                      </span>
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    placeholder="Last name"
                    className={errors.lastName ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="text-red-400 text-xs">!</span>
                      </span>
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <PhoneInput
                  id="phone"
                  value={formData.phone}
                  onChange={(val) => handleFieldChange('phone', val)}
                  placeholder="Phone number"
                  className={errors.phone ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-red-400 text-xs">!</span>
                    </span>
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="gender">Gender *</Label>
                <CustomSelect
                  options={[
                    { value: 'brother', label: 'Brother' },
                    { value: 'sister', label: 'Sister' }
                  ]}
                  value={formData.gender}
                  onChange={(value) => handleFieldChange('gender', value as 'brother' | 'sister')}
                  placeholder="Select gender"
                  className={errors.gender ? "border-red-500" : ""}
                />
                {errors.gender && (
                  <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-red-400 text-xs">!</span>
                    </span>
                    {errors.gender}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contactType">Role *</Label>
                <CustomSelect
                  options={[
                    { value: 'poc', label: 'Point of Contact (POC)' },
                    { value: 'volunteer', label: 'Volunteer' }
                  ]}
                  value={formData.contactType}
                  onChange={(value) => handleFieldChange('contactType', value as 'poc' | 'volunteer')}
                  placeholder="Select role"
                  className={errors.contactType ? "border-red-500" : ""}
                />
                {errors.contactType && (
                  <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-red-400 text-xs">!</span>
                    </span>
                    {errors.contactType}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">
                  Email {formData.contactType === 'poc' ? '*' : '(Optional)'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="Email address"
                  className={errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-red-400 text-xs">!</span>
                    </span>
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                className="w-full sm:w-auto border-white/15 text-white/70 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="w-full sm:w-auto bg-gold-400 hover:bg-gold-300 text-navy-900"
              >
                {editingContact ? "Update Contact" : "Add Contact"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import contacts. The file should have columns for Name, Phone, Email (optional), Gender (optional), and Contact Type (optional, defaults to POC).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="border-white/15 focus:border-gold-400 focus:ring-gold-400/20"
              />
              <p className="text-sm text-white/40">
                Supported format: CSV with headers (Name, Phone, Email, Gender, Contact Type)
              </p>
            </div>

            {/* Preview */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (First 5 rows)</Label>
                <div className="max-h-40 overflow-y-auto border border-white/10 rounded-md p-3 bg-background">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {Object.keys(importPreview[0] || {}).map(header => (
                          <th key={header} className="text-left py-1 px-2 font-medium text-white/70">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, index) => (
                        <tr key={index} className="border-b border-white/5">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="py-1 px-2 text-white/50">
                              {String(value || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sample CSV */}
            <div className="space-y-2">
              <Label>Sample CSV Format</Label>
              <div className="bg-background p-3 rounded-md font-mono text-sm">
                <div>Name,Phone,Email,Gender,Contact Type</div>
                <div>John Doe,+1234567890,john@example.com,brother,poc</div>
                <div>Jane Smith,+1234567891,jane@example.com,sister,volunteer</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sampleData = `Name,Phone,Email,Gender,Contact Type
John Doe,+1234567890,john@example.com,brother,poc
Jane Smith,+1234567891,jane@example.com,sister,volunteer
Ahmed Hassan,+1234567892,ahmed@example.com,brother,poc
Fatima Ali,+1234567893,fatima@example.com,sister,volunteer
Mohammed Khan,+1234567894,mohammed@example.com,brother,poc
Aisha Rahman,+1234567895,aisha@example.com,sister,volunteer`;
                  const blob = new Blob([sampleData], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'sample_contacts.csv';
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download Sample CSV
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportFile(null);
                setImportPreview([]);
              }}
              disabled={importLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importLoading}
              className="bg-gold-400 hover:bg-gold-300 text-navy-900"
            >
              {importLoading ? 'Importing...' : 'Import Contacts'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
