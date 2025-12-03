import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sofa, Bed, CookingPot, Bath, Monitor, Home, Car, Trees, Dumbbell } from 'lucide-react';

const roomIcons = [
  { value: 'sofa', label: 'Sala', icon: Sofa },
  { value: 'bed', label: 'Quarto', icon: Bed },
  { value: 'cooking-pot', label: 'Cozinha', icon: CookingPot },
  { value: 'bath', label: 'Banheiro', icon: Bath },
  { value: 'monitor', label: 'Escritório', icon: Monitor },
  { value: 'home', label: 'Área Externa', icon: Home },
  { value: 'car', label: 'Garagem', icon: Car },
  { value: 'trees', label: 'Jardim', icon: Trees },
  { value: 'dumbbell', label: 'Academia', icon: Dumbbell },
];

interface AddRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomAdded: () => void;
}

const AddRoomDialog = ({ open, onOpenChange, onRoomAdded }: AddRoomDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('home');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;

    setLoading(true);

    const { error } = await supabase
      .from('rooms')
      .insert({
        user_id: user.id,
        name,
        icon,
      });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o cômodo.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Cômodo adicionado!',
        description: `${name} foi adicionado com sucesso.`,
      });
      setName('');
      setIcon('home');
      onOpenChange(false);
      onRoomAdded();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50">
        <DialogHeader>
          <DialogTitle>Adicionar Cômodo</DialogTitle>
          <DialogDescription>
            Crie um novo cômodo para organizar seus dispositivos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Nome do cômodo</Label>
            <Input
              id="room-name"
              placeholder="Ex: Sala de Estar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roomIcons.map((ri) => (
                  <SelectItem key={ri.value} value={ri.value}>
                    <div className="flex items-center gap-2">
                      <ri.icon className="w-4 h-4" />
                      {ri.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !name}>
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRoomDialog;
