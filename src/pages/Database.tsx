
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { Plus, Edit, MapPin, Phone, Mail, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Team {
  id: string;
  name: string;
  phone: string;
  roles: string[];
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  label: string;
  address: string;
  map_link?: string;
  created_at: string;
  updated_at: string;
}

interface Sponsor {
  id: string;
  org_name: string;
  contact_person: string;
  contact_phone?: string;
  contact_email?: string;
  sponsorship_level: string;
  created_at: string;
  updated_at: string;
}

const Database = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isSponsorDialogOpen, setIsSponsorDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const availableRoles = ['Coordinator', 'Setup', 'Registration', 'Ushers', 'Marketing', 'Cleanup', 'AV/Tech', 'Food Service'];
  const sponsorshipLevels = ['Bronze', 'Silver', 'Gold', 'Platinum'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsRes, locationsRes, sponsorsRes] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('locations').select('*').order('label'),
        supabase.from('sponsors').select('*').order('org_name')
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (sponsorsRes.error) throw sponsorsRes.error;

      setTeams(teamsRes.data || []);
      setLocations(locationsRes.data || []);
      setSponsors(sponsorsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load database information.",
        variant: "destructive",
      });
    }
  };

  const saveTeam = async (teamData: Partial<Team>) => {
    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update({
            name: teamData.name,
            phone: teamData.phone,
            roles: teamData.roles,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTeam.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Team member updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('teams')
          .insert([{
            name: teamData.name,
            phone: teamData.phone,
            roles: teamData.roles || []
          }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Team member added successfully.",
        });
      }

      setIsTeamDialogOpen(false);
      setEditingTeam(null);
      loadData();
    } catch (error) {
      console.error('Error saving team:', error);
      toast({
        title: "Error",
        description: "Failed to save team member.",
        variant: "destructive",
      });
    }
  };

  const saveLocation = async (locationData: Partial<Location>) => {
    try {
      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update({
            label: locationData.label,
            address: locationData.address,
            map_link: locationData.map_link,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLocation.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Location updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('locations')
          .insert([{
            label: locationData.label,
            address: locationData.address,
            map_link: locationData.map_link
          }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Location added successfully.",
        });
      }

      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      loadData();
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location.",
        variant: "destructive",
      });
    }
  };

  const saveSponsor = async (sponsorData: Partial<Sponsor>) => {
    try {
      if (editingSponsor) {
        const { error } = await supabase
          .from('sponsors')
          .update({
            org_name: sponsorData.org_name,
            contact_person: sponsorData.contact_person,
            contact_phone: sponsorData.contact_phone,
            contact_email: sponsorData.contact_email,
            sponsorship_level: sponsorData.sponsorship_level,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSponsor.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Sponsor updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('sponsors')
          .insert([{
            org_name: sponsorData.org_name,
            contact_person: sponsorData.contact_person,
            contact_phone: sponsorData.contact_phone,
            contact_email: sponsorData.contact_email,
            sponsorship_level: sponsorData.sponsorship_level || 'Bronze'
          }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Sponsor added successfully.",
        });
      }

      setIsSponsorDialogOpen(false);
      setEditingSponsor(null);
      loadData();
    } catch (error) {
      console.error('Error saving sponsor:', error);
      toast({
        title: "Error",
        description: "Failed to save sponsor.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Management</h1>
          <p className="text-gray-600">Manage your teams, locations, and sponsors for smarter event planning.</p>
        </div>

        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Teams</span>
                    </CardTitle>
                    <CardDescription>Manage your team members and their roles</CardDescription>
                  </div>
                  <TeamDialog
                    isOpen={isTeamDialogOpen}
                    onOpenChange={setIsTeamDialogOpen}
                    onSave={saveTeam}
                    editingTeam={editingTeam}
                    availableRoles={availableRoles}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{team.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{team.phone}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {team.roles?.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTeam(team);
                          setIsTeamDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No team members yet. Add your first team member!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" />
                      <span>Locations</span>
                    </CardTitle>
                    <CardDescription>Manage your event locations</CardDescription>
                  </div>
                  <LocationDialog
                    isOpen={isLocationDialogOpen}
                    onOpenChange={setIsLocationDialogOpen}
                    onSave={saveLocation}
                    editingLocation={editingLocation}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{location.label}</h3>
                        <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                      </div>
                      <div className="flex space-x-2">
                        {location.map_link && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={location.map_link} target="_blank" rel="noopener noreferrer">
                              <MapPin className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingLocation(location);
                            setIsLocationDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {locations.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No locations yet. Add your first location!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sponsors">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Sponsors</CardTitle>
                    <CardDescription>Manage your event sponsors and partnerships</CardDescription>
                  </div>
                  <SponsorDialog
                    isOpen={isSponsorDialogOpen}
                    onOpenChange={setIsSponsorDialogOpen}
                    onSave={saveSponsor}
                    editingSponsor={editingSponsor}
                    sponsorshipLevels={sponsorshipLevels}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{sponsor.org_name}</h3>
                          <Badge variant="outline">{sponsor.sponsorship_level}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{sponsor.contact_person}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          {sponsor.contact_phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{sponsor.contact_phone}</span>
                            </div>
                          )}
                          {sponsor.contact_email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4" />
                              <span>{sponsor.contact_email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSponsor(sponsor);
                          setIsSponsorDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {sponsors.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No sponsors yet. Add your first sponsor!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Team Dialog Component
const TeamDialog = ({ isOpen, onOpenChange, onSave, editingTeam, availableRoles }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    roles: [] as string[]
  });

  useEffect(() => {
    if (editingTeam) {
      setFormData({
        name: editingTeam.name,
        phone: editingTeam.phone,
        roles: editingTeam.roles || []
      });
    } else {
      setFormData({ name: '', phone: '', roles: [] });
    }
  }, [editingTeam, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => onOpenChange(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTeam ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          <DialogDescription>
            Add or edit team member information and their roles.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map((role: string) => (
                <div key={role} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={role}
                    checked={formData.roles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded"
                  />
                  <Label htmlFor={role} className="text-sm">{role}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTeam ? 'Update' : 'Add'} Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Location Dialog Component
const LocationDialog = ({ isOpen, onOpenChange, onSave, editingLocation }: any) => {
  const [formData, setFormData] = useState({
    label: '',
    address: '',
    map_link: ''
  });

  useEffect(() => {
    if (editingLocation) {
      setFormData({
        label: editingLocation.label,
        address: editingLocation.address,
        map_link: editingLocation.map_link || ''
      });
    } else {
      setFormData({ label: '', address: '', map_link: '' });
    }
  }, [editingLocation, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => onOpenChange(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
          <DialogDescription>
            Add or edit location information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Location Name</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="map_link">Map Link (Optional)</Label>
            <Input
              id="map_link"
              value={formData.map_link}
              onChange={(e) => setFormData(prev => ({ ...prev, map_link: e.target.value }))}
              placeholder="https://maps.google.com/..."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingLocation ? 'Update' : 'Add'} Location
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Sponsor Dialog Component
const SponsorDialog = ({ isOpen, onOpenChange, onSave, editingSponsor, sponsorshipLevels }: any) => {
  const [formData, setFormData] = useState({
    org_name: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    sponsorship_level: 'Bronze'
  });

  useEffect(() => {
    if (editingSponsor) {
      setFormData({
        org_name: editingSponsor.org_name,
        contact_person: editingSponsor.contact_person,
        contact_phone: editingSponsor.contact_phone || '',
        contact_email: editingSponsor.contact_email || '',
        sponsorship_level: editingSponsor.sponsorship_level
      });
    } else {
      setFormData({
        org_name: '',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        sponsorship_level: 'Bronze'
      });
    }
  }, [editingSponsor, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => onOpenChange(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Sponsor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'Add Sponsor'}</DialogTitle>
          <DialogDescription>
            Add or edit sponsor information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org_name">Organization Name</Label>
            <Input
              id="org_name"
              value={formData.org_name}
              onChange={(e) => setFormData(prev => ({ ...prev, org_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Phone (Optional)</Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Email (Optional)</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorship_level">Sponsorship Level</Label>
            <Select
              value={formData.sponsorship_level}
              onValueChange={(value) => setFormData(prev => ({ ...prev, sponsorship_level: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sponsorshipLevels.map((level: string) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingSponsor ? 'Update' : 'Add'} Sponsor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Database;
