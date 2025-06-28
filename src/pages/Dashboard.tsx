
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Plus, 
  Settings,
  Database,
  Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import VolunteerBackupViewer from "@/components/volunteer/VolunteerBackupViewer";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Management Dashboard</h1>
          <p className="text-gray-600">Manage your events and monitor volunteer activity</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
            <TabsTrigger value="backup">
              <Activity className="w-4 h-4 mr-2" />
              Activity Monitor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    No events created yet
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Volunteers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Across all events
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Next 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Locations</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Saved locations
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks to get you started</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => navigate('/create-event')} 
                    className="w-full justify-start"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Event
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/settings')} 
                    className="w-full justify-start"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Event Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('backup')} 
                    className="w-full justify-start"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    View Activity Monitor
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest volunteer and event updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    No recent activity to display
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Events</h2>
              <Button onClick={() => navigate('/create-event')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first event.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => navigate('/create-event')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Event
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volunteers" className="space-y-6">
            <h2 className="text-2xl font-bold">Volunteer Management</h2>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No volunteers</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Volunteers will appear here once you create events and people sign up.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <VolunteerBackupViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
