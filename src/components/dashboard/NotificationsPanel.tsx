import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Check, Trash2, AlertCircle, Info, CheckCircle2, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import FaceRecognitionBanner from './FaceRecognitionBanner';

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
  members: HouseholdMember[];
  recognizedMemberId: string | null;
  onMemberRecognized: (memberId: string | null) => void;
}

const NotificationsPanel = ({ members, recognizedMemberId, onMemberRecognized }: NotificationsPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedFor, setLastGeneratedFor] = useState<string | null | undefined>(undefined);

  const recognizedMember = members.find(m => m.id === recognizedMemberId) || null;
  const displayName = recognizedMember ? recognizedMember.name : 'Todos';

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    const query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by member or general
    if (recognizedMemberId) {
      query.or(`member_id.eq.${recognizedMemberId},member_id.is.null`);
    } else {
      query.is('member_id', null);
    }

    const { data } = await query;
    if (data) setNotifications(data);
    setLoading(false);
  }, [user, recognizedMemberId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-generate notifications when recognized member changes
  useEffect(() => {
    if (lastGeneratedFor === undefined) {
      setLastGeneratedFor(recognizedMemberId);
      return;
    }
    if (recognizedMemberId !== lastGeneratedFor) {
      setLastGeneratedFor(recognizedMemberId);
      generateNotifications();
    }
  }, [recognizedMemberId]);

  const generateNotifications = async () => {
    if (!user || generating) return;
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-notifications', {
        body: { memberId: recognizedMemberId, userId: user.id }
      });
      if (error) throw error;
      await fetchNotifications();
    } catch (err: any) {
      console.error('Generate notifications error:', err);
      toast({
        title: 'Erro ao gerar notificações',
        description: 'Tente novamente em alguns segundos.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase.from('notifications').delete().eq('id', notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'reminder': return <Calendar className="w-4 h-4 text-yellow-500" />;
      case 'task': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
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
      {/* Face Recognition Banner - always on */}
      <FaceRecognitionBanner
        members={members}
        onMemberRecognized={onMemberRecognized}
        recognizedMemberId={recognizedMemberId}
      />

      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={generateNotifications}
              disabled={generating}
              title="Gerar novas notificações"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Dynamic label showing who's recognized */}
        <div className="mt-2 flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-sm px-3 py-1 transition-all",
              recognizedMember && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            )}
          >
            {recognizedMember ? `🙋 ${displayName}` : '👥 Todos'}
          </Badge>
          {generating && (
            <span className="text-xs text-muted-foreground animate-pulse">Gerando...</span>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="mb-2">Nenhuma notificação</p>
            <Button variant="outline" size="sm" onClick={generateNotifications} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Gerar notificações
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => (
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
                  <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-medium text-sm",
                      !notification.is_read && "text-primary"
                    )}>
                      {notification.title}
                    </h4>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!notification.is_read && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAsRead(notification.id)}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" size="icon" 
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
    </div>
  );
};

export default NotificationsPanel;
