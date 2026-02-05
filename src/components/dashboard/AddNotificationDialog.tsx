import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Loader2 } from 'lucide-react';

interface HouseholdMember {
  id: string;
  name: string;
}

interface AddNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: HouseholdMember[];
  onNotificationAdded: () => void;
}

const AddNotificationDialog = ({ open, onOpenChange, members, onNotificationAdded }: AddNotificationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [memberId, setMemberId] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: title.trim(),
        message: message.trim() || null,
        type,
        member_id: memberId === 'all' ? null : memberId,
      });

      if (error) throw error;

      toast({
        title: 'Notificação criada!',
        description: 'A notificação foi adicionada com sucesso.',
      });

      onNotificationAdded();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a notificação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setMessage('');
    setType('info');
    setMemberId('all');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Notificação</DialogTitle>
          <DialogDescription>
            Crie uma notificação para você ou um membro específico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Reunião às 15h"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Detalhes adicionais..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Informação</SelectItem>
                  <SelectItem value="alert">⚠️ Alerta</SelectItem>
                  <SelectItem value="reminder">📅 Lembrete</SelectItem>
                  <SelectItem value="task">✅ Tarefa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Para quem</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">👨‍👩‍👧‍👦 Todos</SelectItem>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      👤 {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim()} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Criar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNotificationDialog;
