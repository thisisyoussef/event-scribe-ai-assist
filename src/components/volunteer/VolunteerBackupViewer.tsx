
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Calendar, User, Phone, Trash2, Edit, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BackupRecord {
  backup_id: string;
  original_volunteer_id: string;
  name: string;
  phone: string;
  operation_type: string;
  operation_timestamp: string;
  event_title: string;
  role_label: string;
  old_data: any;
  new_data: any;
}

const VolunteerBackupViewer = () => {
  const { toast } = useToast();
  const [backupData, setBackupData] = useState<BackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBackupData = async () => {
    setIsLoading(true);
    try {
      console.log('[BACKUP] Fetching volunteer activity log...');
      
      const { data, error } = await supabase
        .from('volunteer_activity_log')
        .select('*')
        .order('operation_timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[BACKUP] Error fetching backup data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch backup data.",
          variant: "destructive",
        });
        return;
      }

      console.log(`[BACKUP] Fetched ${data?.length || 0} backup records`);
      setBackupData(data || []);
    } catch (error) {
      console.error('[BACKUP] Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching backup data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupData();
  }, []);

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getOperationBadge = (operation: string) => {
    const variants = {
      INSERT: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={variants[operation as keyof typeof variants] || ""}>
        {operation}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const recentDeletions = backupData.filter(record => record.operation_type === 'DELETE');
  const recentSignups = backupData.filter(record => record.operation_type === 'INSERT');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Volunteer Activity Monitor</h2>
          <p className="text-gray-600">Track all volunteer changes and deletions</p>
        </div>
        <Button onClick={fetchBackupData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Plus className="w-4 h-4 mr-2 text-green-600" />
              Recent Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {recentSignups.length}
            </div>
            <p className="text-xs text-gray-600">Last 100 records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Trash2 className="w-4 h-4 mr-2 text-red-600" />
              Recent Deletions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {recentDeletions.length}
            </div>
            <p className="text-xs text-gray-600">Last 100 records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Total Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupData.length}
            </div>
            <p className="text-xs text-gray-600">All operations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Activity</TabsTrigger>
          <TabsTrigger value="deletions">Deletions Only</TabsTrigger>
          <TabsTrigger value="signups">Signups Only</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Volunteer Activity</CardTitle>
              <CardDescription>
                Complete log of all volunteer changes (last 100 records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : backupData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No activity found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupData.map((record) => (
                      <TableRow key={record.backup_id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getOperationIcon(record.operation_type)}
                            {getOperationBadge(record.operation_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {record.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{record.event_title || 'Unknown Event'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{record.role_label || 'Unknown Role'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatTimestamp(record.operation_timestamp)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deletions">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Recent Deletions</CardTitle>
              <CardDescription>
                All volunteer deletions with complete details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentDeletions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No deletions found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Deleted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDeletions.map((record) => (
                      <TableRow key={record.backup_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {record.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{record.event_title || 'Unknown Event'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{record.role_label || 'Unknown Role'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatTimestamp(record.operation_timestamp)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signups">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Recent Signups</CardTitle>
              <CardDescription>
                All new volunteer registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSignups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No signups found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Signed Up At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSignups.map((record) => (
                      <TableRow key={record.backup_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {record.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{record.event_title || 'Unknown Event'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{record.role_label || 'Unknown Role'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatTimestamp(record.operation_timestamp)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VolunteerBackupViewer;
