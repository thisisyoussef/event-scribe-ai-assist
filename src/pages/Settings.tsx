
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Key, MessageSquare, User, Zap, Shield, Crown, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user, loading, refreshAdminStatus } = useAdminStatus();
  const [adminCode, setAdminCode] = useState("");
  const [adminInputVisible, setAdminInputVisible] = useState(false);
  const lastShiftPressRef = useRef<number | null>(null);
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    organization: ""
  });
  const [settings, setSettings] = useState({
    openaiKey: "",
    twilioSid: "",
    twilioToken: "",
    twilioPhone: "",
    confirmationTemplate: "Thanks [Name]! You're signed up as [Role] on [Date] at [Time]. POC: [POCName] ([Phone]).",
    dayBeforeTemplate: "Hi [Name], reminder: you're assigned as [Role] tomorrow at [Time]. POC: [POCName] ([Phone]).",
    dayOfTemplate: "Hi [Name], your [Role] shift starts in 3 hours at [Time]. POC: [POCName] ([Phone]).",
    timezone: "America/New_York"
  });

  const showAdminTab = isAdmin || adminInputVisible;

  useEffect(() => {
    // Check if user is logged in using Supabase
    const checkUser = async () => {
      console.log('Settings: Checking user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Settings: User error:', error);
        navigate("/login");
        return;
      }
      
      console.log('Settings: User data:', user);
      
      if (!user) {
        console.log('Settings: No user, redirecting to login');
        navigate("/login");
        return;
      }
      
      console.log('Settings: User found:', user);
      console.log('Settings: User metadata:', user.user_metadata);

      // Load settings
      const savedSettings = localStorage.getItem("settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Initialize profile data
      if (user) {
        setProfileData({
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          phone: user.user_metadata?.phone || "",
          organization: user.user_metadata?.organization || ""
        });

        // Check if user has a profile record, create one if not
        await ensureUserProfile(user.id);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Settings: Auth state change:', event, session?.user?.id);
        if (event === 'SIGNED_OUT') {
          navigate("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Reveal admin input when Shift is pressed twice quickly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !e.repeat) {
        const now = Date.now();
        const last = lastShiftPressRef.current;
        if (last && now - last <= 500) {
          setAdminInputVisible(true);
        }
        lastShiftPressRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const ensureUserProfile = async (userId: string) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        console.log('Creating profile for user:', userId);
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
            phone: user?.user_metadata?.phone || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          console.log('Profile created successfully');
        }
      } else if (existingProfile) {
        console.log('Profile already exists for user:', userId);
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("settings", JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Your configuration has been updated successfully.",
    });
  };

  const activateAdminMode = async () => {
    if (!adminCode.trim()) {
      toast({
        title: "Admin Code Required",
        description: "Please enter the admin code to activate admin mode.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Attempting to activate admin mode with code:', adminCode.trim());
      
      const { data, error } = await supabase.rpc('activate_admin_mode', {
        admin_code: adminCode.trim()
      });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('Admin activation error:', error);
        toast({
          title: "Admin Activation Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setAdminCode("");
        
        console.log('Admin mode activated successfully!');
        console.log('Refreshing admin status...');
        
        // Refresh admin status from the hook
        await refreshAdminStatus();

        toast({
          title: "Admin Mode Activated!",
          description: "You now have admin privileges. You can delete any event and access advanced features.",
        });
      } else {
        toast({
          title: "Invalid Admin Code",
          description: "The admin code you entered is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Admin activation error:', error);
      toast({
        title: "Admin Activation Failed",
        description: "An unexpected error occurred while activating admin mode.",
        variant: "destructive",
      });
    }
  };

  const deactivateAdminMode = async () => {
    try {
      console.log('Attempting to deactivate admin mode...');
      
      const { data, error } = await supabase.rpc('deactivate_admin_mode');

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('Admin deactivation error:', error);
        toast({
          title: "Admin Deactivation Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        console.log('Admin mode deactivated successfully!');
        console.log('Refreshing admin status...');
        
        // Refresh the session to get updated metadata
        const { error: sessionError } = await supabase.auth.refreshSession();
        if (sessionError) {
          console.error('Error refreshing session:', sessionError);
        }
        
        // Refresh admin status from the hook
        await refreshAdminStatus();

        toast({
          title: "Admin Mode Deactivated",
          description: "You have returned to normal user status.",
        });
      } else {
        toast({
          title: "Deactivation Failed",
          description: "Unable to deactivate admin mode. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Admin deactivation error:', error);
      toast({
        title: "Admin Deactivation Failed",
        description: "An unexpected error occurred while deactivating admin mode.",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async () => {
    if (user) {
      try {
        // Update user metadata in Supabase
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: profileData.full_name,
            name: profileData.full_name,
            phone: profileData.phone,
            organization: profileData.organization
          }
        });

        if (error) {
          toast({
            title: "Profile Update Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Profile Updated",
            description: "Your profile information has been saved.",
          });
        }
      } catch (error) {
        console.error('Profile update error:', error);
        toast({
          title: "Profile Update Failed",
          description: "An unexpected error occurred while updating your profile.",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-3 border-gold-400 border-t-transparent rounded-full mx-auto mb-6"></div>
              <p className="text-white/70 font-medium text-lg">Loading settings...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white/70 font-medium text-lg">Please log in to access settings.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-white/50 mt-1">Configure your integrations and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${showAdminTab ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            {showAdminTab && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        full_name: e.target.value
                      }))}
                      placeholder="Your full name"
                    />
                    <p className="text-sm text-white/40">
                      Current: {user?.user_metadata?.full_name || user?.user_metadata?.name || "Not set"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-white/10"
                      placeholder="your@email.com"
                    />
                    <p className="text-sm text-white/40">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                      id="phone"
                      value={profileData.phone}
                      onChange={(val) => setProfileData(prev => ({
                        ...prev,
                        phone: val
                      }))}
                      placeholder="Phone number"
                    />
                    <p className="text-sm text-white/40">
                      Current: {user?.user_metadata?.phone || "Not set"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization (Optional)</Label>
                    <Input
                      id="organization"
                      value={profileData.organization}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        organization: e.target.value
                      }))}
                      placeholder="Community Center, Mosque, etc."
                    />
                    <p className="text-sm text-white/40">
                      Current: {user?.user_metadata?.organization || "Not set"}
                    </p>
                  </div>
                </div>
                
                <Button onClick={updateProfile} className="mt-4">
                  Update Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              {/* OpenAI Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>OpenAI Integration</span>
                  </CardTitle>
                  <CardDescription>
                    Configure OpenAI API for AI-powered role suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="openaiKey">OpenAI API Key</Label>
                    <Input
                      id="openaiKey"
                      type="password"
                      value={settings.openaiKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, openaiKey: e.target.value }))}
                      placeholder="sk-..."
                    />
                    <p className="text-sm text-white/40">
                      Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenAI Platform</a>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Twilio/SMS Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>SMS Integration (Twilio)</span>
                  </CardTitle>
                  <CardDescription>
                    Configure SMS service for automated reminders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="twilioSid">Account SID</Label>
                      <Input
                        id="twilioSid"
                        type="password"
                        value={settings.twilioSid}
                        onChange={(e) => setSettings(prev => ({ ...prev, twilioSid: e.target.value }))}
                        placeholder="AC..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="twilioToken">Auth Token</Label>
                      <Input
                        id="twilioToken"
                        type="password"
                        value={settings.twilioToken}
                        onChange={(e) => setSettings(prev => ({ ...prev, twilioToken: e.target.value }))}
                        placeholder="Your auth token"
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="twilioPhone">Twilio Phone Number</Label>
                      <PhoneInput
                        id="twilioPhone"
                        value={settings.twilioPhone}
                        onChange={(val) => setSettings(prev => ({ ...prev, twilioPhone: val }))}
                        placeholder="Twilio number"
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-white/40">
                    Get your Twilio credentials from <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Twilio Console</a>
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>SMS Message Templates</CardTitle>
                <CardDescription>
                  Customize your automated SMS messages. Use placeholders: [Name], [Role], [Date], [Time], [POCName], [Phone]
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="confirmationTemplate">Confirmation Message</Label>
                  <Textarea
                    id="confirmationTemplate"
                    value={settings.confirmationTemplate}
                    onChange={(e) => setSettings(prev => ({ ...prev, confirmationTemplate: e.target.value }))}
                    rows={3}
                    placeholder="Message sent when someone signs up"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dayBeforeTemplate">Day Before Reminder</Label>
                  <Textarea
                    id="dayBeforeTemplate"
                    value={settings.dayBeforeTemplate}
                    onChange={(e) => setSettings(prev => ({ ...prev, dayBeforeTemplate: e.target.value }))}
                    rows={3}
                    placeholder="Message sent the day before the event"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dayOfTemplate">Day Of Reminder</Label>
                  <Textarea
                    id="dayOfTemplate"
                    value={settings.dayOfTemplate}
                    onChange={(e) => setSettings(prev => ({ ...prev, dayOfTemplate: e.target.value }))}
                    rows={3}
                    placeholder="Message sent on the day of the event"
                  />
                </div>

                <div className="bg-blue-500/15 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Available Placeholders:</h4>
                  <div className="text-sm text-white/50 grid grid-cols-2 gap-2">
                    <span><code>[Name]</code> - Volunteer's name</span>
                    <span><code>[Role]</code> - Their assigned role</span>
                    <span><code>[Date]</code> - Event date</span>
                    <span><code>[Time]</code> - Shift time</span>
                    <span><code>[POCName]</code> - Point of contact name</span>
                    <span><code>[Phone]</code> - POC phone number</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>General Preferences</CardTitle>
                <CardDescription>
                  Configure system-wide preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <select
                    id="timezone"
                    value={settings.timezone}
                    onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full border border-white/15 rounded-md px-3 py-2"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Tab */}
          {showAdminTab && (
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <span>Admin Mode</span>
                </CardTitle>
                <CardDescription>
                  Activate admin privileges to access advanced features and delete any event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Debug Info */}
                <div className="bg-background border border-white/10 rounded-lg p-4">
                  <div className="text-sm text-white/50">
                    <p><strong>Debug Info:</strong></p>
                    <p>isAdmin: {isAdmin ? 'true' : 'false'}</p>
                    <p>User ID: {user?.id || 'none'}</p>
                    <p>User Metadata: {JSON.stringify(user?.user_metadata || {}, null, 2)}</p>
                  </div>
                  <Button 
                    onClick={async () => {
                      console.log('Manual admin status check...');
                      await refreshAdminStatus();
                      console.log('Admin status refreshed');
                    }}
                    className="mt-2"
                    variant="outline"
                    size="sm"
                  >
                    Refresh Admin Status
                  </Button>
                </div>

                {isAdmin ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        <span className="font-medium text-emerald-300">Admin Mode Active</span>
                      </div>
                      <p className="text-emerald-300 mt-2">
                        You currently have admin privileges. You can:
                      </p>
                      <ul className="text-emerald-300 mt-2 list-disc list-inside space-y-1">
                        <li>Delete any event, regardless of ownership</li>
                        <li>Access advanced system features</li>
                        <li>Manage all user events and data</li>
                      </ul>
                    </div>
                    <Button 
                      onClick={deactivateAdminMode} 
                      variant="outline"
                      className="w-full sm:w-auto border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-400"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Deactivate Admin Mode
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-500/15 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <span className="font-medium text-blue-300">Admin Privileges</span>
                      </div>
                      <p className="text-blue-300 mt-2">
                        Admin mode grants you elevated privileges including the ability to delete any event in the system.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminCode">Admin Code</Label>
                      <Input
                        id="adminCode"
                        type="password"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="Enter admin code"
                        className="font-mono"
                      />
                      <p className="text-sm text-white/40">
                        Enter the admin code to activate admin mode
                      </p>
                    </div>

                    <Button 
                      onClick={activateAdminMode} 
                      className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                      disabled={!adminCode.trim()}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Activate Admin Mode
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
        
        <div className="flex justify-end mt-6">
          <Button onClick={saveSettings} className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
            <Key className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
