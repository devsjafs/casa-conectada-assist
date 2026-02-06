import { useState, useEffect } from 'react';
import { Settings, User, Trash2, Edit2, Camera, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AddMemberDialog from './AddMemberDialog';
import { cn } from '@/lib/utils';

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
  face_embedding: any;
  preferences: {
    music?: string[];
    sports?: string[];
    interests?: string[];
  } | null;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMembersUpdated?: () => void;
}

const SettingsDialog = ({ open, onOpenChange, onMembersUpdated }: SettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchMembers();
    }
  }, [open, user]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');

    if (data) {
      setMembers(data.map(m => ({
        ...m,
        preferences: m.preferences as HouseholdMember['preferences']
      })));
    }
    setLoading(false);
  };

  const handleDeleteMember = async (member: HouseholdMember) => {
    setDeletingId(member.id);
    try {
      // Delete related notifications first
      await supabase
        .from('notifications')
        .delete()
        .eq('member_id', member.id);

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: `${member.name} foi removido com sucesso.`,
      });

      setMembers(prev => prev.filter(m => m.id !== member.id));
      onMembersUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMemberAdded = () => {
    fetchMembers();
    onMembersUpdated?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configurações
            </DialogTitle>
            <DialogDescription>
              Gerencie os membros da casa e suas preferências para notificações personalizadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Membros da Casa
                </h4>
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  Adicionar
                </Button>
              </div>

              <ScrollArea className="h-[300px] pr-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="mb-2">Nenhum membro cadastrado</p>
                    <p className="text-sm">Adicione membros da casa para ativar o reconhecimento facial e notificações personalizadas.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.name}
                              className="w-12 h-12 rounded-full object-cover"
                              style={{ transform: 'scaleX(-1)' }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium truncate">{member.name}</h5>
                              {member.avatar_url && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  <Camera className="w-3 h-3 mr-1" />
                                  Foto
                                </Badge>
                              )}
                            </div>

                            {/* Preferences */}
                            <div className="flex flex-wrap gap-1">
                              {member.preferences?.music?.map((item) => (
                                <Badge key={item} variant="secondary" className="text-xs">
                                  🎵 {item}
                                </Badge>
                              ))}
                              {member.preferences?.sports?.map((item) => (
                                <Badge key={item} variant="secondary" className="text-xs">
                                  ⚽ {item}
                                </Badge>
                              ))}
                              {member.preferences?.interests?.map((item) => (
                                <Badge key={item} variant="secondary" className="text-xs">
                                  ⭐ {item}
                                </Badge>
                              ))}
                              {!member.preferences?.music?.length && 
                               !member.preferences?.sports?.length && 
                               !member.preferences?.interests?.length && (
                                <span className="text-xs text-muted-foreground">
                                  Sem preferências cadastradas
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteMember(member)}
                            disabled={deletingId === member.id}
                          >
                            {deletingId === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Info */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong>Dica:</strong> Adicione fotos dos membros para que o sistema reconheça automaticamente quem está em frente à câmera e mostre notificações personalizadas.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddMemberDialog
        open={showAddMember}
        onOpenChange={setShowAddMember}
        onMemberAdded={handleMemberAdded}
      />
    </>
  );
};

export default SettingsDialog;
