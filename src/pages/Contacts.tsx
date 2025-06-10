
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { Plus, Edit, Trash2, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Contacts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in and load user-specific contacts
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      // Load contacts specific to this user
      const savedContacts = localStorage.getItem(`contacts_${user.id}`);
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    };

    checkUser();
  }, [navigate]);

  const saveContacts = (newContacts: any[]) => {
    if (currentUser) {
      localStorage.setItem(`contacts_${currentUser.id}`, JSON.stringify(newContacts));
      setContacts(newContacts);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    const newContact = {
      id: editingContact?.id || Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      createdAt: editingContact?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser?.id,
    };

    let newContacts;
    if (editingContact) {
      newContacts = contacts.map((contact: any) => 
        contact.id === editingContact.id ? newContact : contact
      );
      toast({
        title: "Contact Updated",
        description: `${formData.name} has been updated successfully.`,
      });
    } else {
      newContacts = [...contacts, newContact];
      toast({
        title: "Contact Added",
        description: `${formData.name} has been added to your contacts.`,
      });
    }

    saveContacts(newContacts);
    setIsDialogOpen(false);
    setEditingContact(null);
    setFormData({ name: "", phone: "" });
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setFormData({ name: contact.name, phone: contact.phone });
    setIsDialogOpen(true);
  };

  const handleDelete = (contactId: string) => {
    const contact = contacts.find((c: any) => c.id === contactId);
    const newContacts = contacts.filter((contact: any) => contact.id !== contactId);
    saveContacts(newContacts);
    
    toast({
      title: "Contact Deleted",
      description: `${contact?.name} has been removed from your contacts.`,
    });
  };

  const openAddDialog = () => {
    setEditingContact(null);
    setFormData({ name: "", phone: "" });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <Navigation />
      
      <main className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-8 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-800">Contact Management</h1>
            <p className="text-amber-600 mt-1 text-sm md:text-base">Manage your event coordinators and points of contact</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={openAddDialog}
                className="w-full lg:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 md:mx-0 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">
                  {editingContact ? "Edit Contact" : "Add New Contact"}
                </DialogTitle>
                <DialogDescription>
                  {editingContact 
                    ? "Update the contact information below." 
                    : "Add a new contact for your events."
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex flex-col md:flex-row justify-end space-y-2 md:space-y-0 md:space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full md:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  >
                    {editingContact ? "Update Contact" : "Add Contact"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Contacts List */}
        <Card className="bg-white/90 backdrop-blur-sm border-amber-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl text-amber-800">Your Contacts</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Contact information for event coordination
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <User className="w-10 md:w-12 h-10 md:h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-amber-800 mb-2">No contacts yet</h3>
                <p className="text-amber-600 mb-4 text-sm md:text-base">Add contacts to assign them to event roles</p>
                <Button 
                  onClick={openAddDialog}
                  className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Contact
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {/* Mobile Card Layout */}
                  {contacts.map((contact: any) => (
                    <Card key={contact.id} className="border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-amber-800 truncate">{contact.name}</div>
                              <div className="flex items-center space-x-1 text-amber-600 text-sm">
                                <Phone className="w-3 h-3" />
                                <span className="truncate">{contact.phone}</span>
                              </div>
                              <div className="text-xs text-amber-500 mt-1">
                                {new Date(contact.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(contact)}
                              className="p-1.5"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(contact.id)}
                              className="p-1.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-200">
                        <th className="text-left py-3 px-4 font-medium text-amber-800">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-amber-800">Phone Number</th>
                        <th className="text-left py-3 px-4 font-medium text-amber-800">Added</th>
                        <th className="text-left py-3 px-4 font-medium text-amber-800">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact: any) => (
                        <tr key={contact.id} className="border-b border-amber-100 hover:bg-amber-50/50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="font-medium text-amber-800">{contact.name}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-amber-400" />
                              <span className="text-amber-700">{contact.phone}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-amber-600">
                              {new Date(contact.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(contact)}
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(contact.id)}
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Contacts;
