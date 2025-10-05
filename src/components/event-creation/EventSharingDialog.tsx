import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEventSharing } from '@/hooks/useEventSharing';
import { EventShare } from '@/types/database';
import { Share2, UserPlus, Trash2, Eye, Edit, Mail, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EventSharingDialogProps {
  eventId: string;
  eventTitle: string;
  trigger?: React.ReactNode;
}

export default function EventSharingDialog({ eventId, eventTitle, trigger }: EventSharingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newPermissionLevel, setNewPermissionLevel] = useState<'view' | 'edit'>('view');
  const [shares, setShares] = useState<EventShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  
  const { shareEvent, getEventShares, removeShare, isLoading } = useEventSharing();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen, eventId]);

  const loadShares = async () => {
    setIsLoadingShares(true);
    try {
      console.log('Loading shares for event:', eventId);
      const eventShares = await getEventShares(eventId);
      console.log('Received shares data:', eventShares);
      setShares(eventShares);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setIsLoadingShares(false);
    }
  };

  const handleShare = async () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to share with.",
        variant: "destructive",
      });
      return;
    }

    const success = await shareEvent(eventId, newUserEmail.trim(), newPermissionLevel);
    if (success) {
      setNewUserEmail('');
      setNewPermissionLevel('view');
      await loadShares();
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    const success = await removeShare(shareId);
    if (success) {
      await loadShares();
    }
  };

  const handlePermissionChange = async (share: EventShare, newLevel: 'view' | 'edit') => {
    const email = share.shared_with_user?.email;
    if (!email) {
      toast({
        title: "Email unavailable",
        description: "Cannot update permission as email is missing.",
        variant: "destructive",
      });
      return;
    }

    const success = await shareEvent(eventId, email, newLevel);
    if (success) {
      await loadShares();
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Event
          </DialogTitle>
          <DialogDescription>
            Share "{eventTitle}" with other users. They can view or edit the event based on the permissions you set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new share */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Share with New User
              </CardTitle>
              <CardDescription>
                Enter an email address to share this event with another user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleShare()}
                  />
                </div>
                <div>
                  <Label htmlFor="permission">Permission Level</Label>
                  <Select value={newPermissionLevel} onValueChange={(value: 'view' | 'edit') => setNewPermissionLevel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View Only
                        </div>
                      </SelectItem>
                      <SelectItem value="edit">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4" />
                          Can Edit
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleShare} 
                disabled={isLoading || !newUserEmail.trim()}
                className="w-full md:w-auto"
              >
                {isLoading ? 'Sharing...' : 'Share Event'}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Existing shares */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Shares</CardTitle>
              <CardDescription>
                Manage users who currently have access to this event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingShares ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading shares...
                </div>
              ) : shares.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users have been shared with this event yet.</p>
                  <p className="text-sm">Use the form above to share with someone.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shares.map((share) => {
                    console.log('Rendering share:', share);
                    return (
                      <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {share.shared_with_user?.email ?? 'Email unavailable'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-2">
                            <Label htmlFor={`perm-${share.id}`} className="sr-only">Permission</Label>
                            <Select
                              value={share.permission_level}
                              onValueChange={(value) => handlePermissionChange(share, value as 'view' | 'edit')}
                            >
                              <SelectTrigger className="h-8 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="view">
                                  <Eye className="w-4 h-4" />
                                </SelectItem>
                                <SelectItem value="edit">
                                  <Edit className="w-4 h-4" />
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Shared {new Date(share.created_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveShare(share.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
