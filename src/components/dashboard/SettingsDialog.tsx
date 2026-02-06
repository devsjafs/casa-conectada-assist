import { useState, useEffect } from 'react';
import { Settings, User, Trash2, Loader2, Bell, Palette, Home, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configurações
            </DialogTitle>
            <DialogDescription>
              Gerencie sua casa inteligente, membros e preferências.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="family" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="family" className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Família</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notificações</span>
              </TabsTrigger>
              <TabsTrigger value="home" className="flex items-center gap-1.5">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Casa</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-1.5">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Aparência</span>
              </TabsTrigger>
            </TabsList>

            {/* Family Tab */}
            <TabsContent value="family" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Membros da Casa</h4>
                  <p className="text-sm text-muted-foreground">
                    Cadastre os moradores para notificações personalizadas.
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  Adicionar
                </Button>
              </div>

              <ScrollArea className="h-[280px] pr-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="mb-2 font-medium">Nenhum membro cadastrado</p>
                    <p className="text-sm mb-4">Adicione membros da casa para ativar o reconhecimento facial.</p>
                    <Button size="sm" onClick={() => setShowAddMember(true)}>
                      Adicionar primeiro membro
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
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

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium truncate">{member.name}</h5>
                              {member.avatar_url && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  📷 Foto
                                </Badge>
                              )}
                            </div>

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
                                  Sem preferências
                                </span>
                              )}
                            </div>
                          </div>

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

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  <strong>Dica:</strong> Adicione fotos dos membros para que o sistema reconheça automaticamente quem está em frente à câmera.
                </p>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Configurações de Notificações</h4>
                <p className="text-sm text-muted-foreground">
                  Personalize como e quando receber alertas.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Notificações de segurança</Label>
                    <p className="text-xs text-muted-foreground">Alertas de movimento e câmeras</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Alertas de dispositivos</Label>
                    <p className="text-xs text-muted-foreground">Status de luzes, AC, etc.</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Notificações personalizadas</Label>
                    <p className="text-xs text-muted-foreground">Baseado nas preferências dos membros</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Sons de notificação</Label>
                    <p className="text-xs text-muted-foreground">Reproduzir som ao receber alertas</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </TabsContent>

            {/* Home Tab */}
            <TabsContent value="home" className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Configurações da Casa</h4>
                <p className="text-sm text-muted-foreground">
                  Gerencie cômodos e automações.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Modo econômico</Label>
                    <p className="text-xs text-muted-foreground">Desliga dispositivos automaticamente</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Modo noturno automático</Label>
                    <p className="text-xs text-muted-foreground">Ativar às 22:00</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Reconhecimento facial</Label>
                    <p className="text-xs text-muted-foreground">Identificar membros automaticamente</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Sincronização automática</Label>
                    <p className="text-xs text-muted-foreground">Atualizar dispositivos em tempo real</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Aparência</h4>
                <p className="text-sm text-muted-foreground">
                  Personalize a interface do dashboard.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Tema escuro</Label>
                    <p className="text-xs text-muted-foreground">Interface com cores escuras</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Animações</Label>
                    <p className="text-xs text-muted-foreground">Transições suaves na interface</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Modo compacto</Label>
                    <p className="text-xs text-muted-foreground">Cards menores, mais informação</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Mostrar relógio</Label>
                    <p className="text-xs text-muted-foreground">Exibir hora no cabeçalho</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
