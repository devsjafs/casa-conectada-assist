import { useState, useEffect } from 'react';
import { Bell, User, Users, Plus, Check, Trash2, Calendar, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import AddMemberDialog from './AddMemberDialog';
import AddNotificationDialog from './AddNotificationDialog';

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
  face_embedding: any;
}

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  scheduled_for: string | null;
  created_at: string;
  member_id: string | null;
}

interface NotificationsPanelProps {
  recognizedMemberId?: string | null;
}

const NotificationsPanel = ({ recognizedMemberId }: NotificationsPanelProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddNotification, setShowAddNotification] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Auto-select recognized member
  useEffect(() => {
    if (recognizedMemberId && members.find(m => m.id === recognizedMemberId)) {
      setSelectedMember(recognizedMemberId);
    }
  }, [recognizedMemberId, members]);

  const fetchData = async () => {
    setLoading(true);
    const [membersRes, notificationsRes] = await Promise.all([
      supabase.from('household_members').select('*').eq('user_id', user?.id),
      supabase.from('notifications').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
    ]);

    if (membersRes.data) setMembers(membersRes.data);
    if (notificationsRes.data) setNotifications(notificationsRes.data);
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const filteredNotifications = selectedMember
    ? notifications.filter(n => n.member_id === selectedMember || n.member_id === null)
    : notifications;

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'reminder': return <Calendar className="w-4 h-4 text-warning" />;
      case 'task': return <CheckCircle2 className="w-4 h-4 text-success" />;
      default: return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="glass rounded-xl h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowAddNotification(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Member tabs */}
        <Tabs 
          value={selectedMember || 'all'} 
          onValueChange={(v) => setSelectedMember(v === 'all' ? null : v)}
          className="w-full"
        >
          <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-4 h-4 mr-1" />
              Todos
            </TabsTrigger>
            {members.map(member => (
              <TabsTrigger 
                key={member.id} 
                value={member.id}
                className={cn(
                  "flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  recognizedMemberId === member.id && "ring-2 ring-success ring-offset-2 ring-offset-background"
                )}
              >
                <User className="w-4 h-4 mr-1" />
                {member.name.split(' ')[0]}
              </TabsTrigger>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-2"
              onClick={() => setShowAddMember(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications list */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificação</p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setShowAddNotification(true)}
            >
              Criar primeira notificação
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  notification.is_read 
                    ? "bg-muted/30 border-border/30" 
                    : "bg-primary/5 border-primary/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn(
                        "font-medium text-sm truncate",
                        !notification.is_read && "text-primary"
                      )}>
                        {notification.title}
                      </h4>
                      {notification.member_id && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {members.find(m => m.id === notification.member_id)?.name.split(' ')[0]}
                        </Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!notification.is_read && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <AddMemberDialog 
        open={showAddMember} 
        onOpenChange={setShowAddMember}
        onMemberAdded={fetchData}
      />

      <AddNotificationDialog
        open={showAddNotification}
        onOpenChange={setShowAddNotification}
        members={members}
        onNotificationAdded={fetchData}
      />
    </div>
  );
};

export default NotificationsPanel;
