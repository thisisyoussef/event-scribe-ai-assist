
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { Key, MessageSquare, User, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(userData));

    // Load settings
    const savedSettings = localStorage.getItem("settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [navigate]);

  const saveSettings = () => {
    localStorage.setItem("settings", JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Your configuration has been updated successfully.",
    });
  };

  const updateProfile = () => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your integrations and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
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
                      value={user.fullName || ""}
                      onChange={(e) => setUser(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={user.phone || ""}
                      onChange={(e) => setUser(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization (Optional)</Label>
                    <Input
                      id="organization"
                      value={user.organization || ""}
                      onChange={(e) => setUser(prev => ({ ...prev, organization: e.target.value }))}
                      placeholder="Community Center, Mosque, etc."
                    />
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
                    <p className="text-sm text-gray-500">
                      Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
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
                      <Input
                        id="twilioPhone"
                        value={settings.twilioPhone}
                        onChange={(e) => setSettings(prev => ({ ...prev, twilioPhone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Get your Twilio credentials from <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twilio Console</a>
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

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Available Placeholders:</h4>
                  <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
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
