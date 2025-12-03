import { useState, useEffect } from 'react';
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
import { Lightbulb, Camera, Wind, Tv, Fan, Speaker, Gauge, ToggleLeft } from 'lucide-react';

const deviceTypes = [
  { value: 'light', label: 'Luz', icon: Lightbulb },
  { value: 'camera', label: 'Câmera', icon: Camera },
  { value: 'ac', label: 'Ar Condicionado', icon: Wind },
  { value: 'tv', label: 'TV', icon: Tv },
  { value: 'fan', label: 'Ventilador', icon: Fan },
  { value: 'soundbar', label: 'Soundbar', icon: Speaker },
  { value: 'sensor', label: 'Sensor', icon: Gauge },
  { value: 'switch', label: 'Interruptor', icon: ToggleLeft },
];

interface Room {
  id: string;
  name: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
}

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceAdded: () => void;
}

const AddDeviceDialog = ({ open, onOpenChange, onDeviceAdded }: AddDeviceDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [integrationId, setIntegrationId] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

  // Camera specific fields
  const [streamUrl, setStreamUrl] = useState('');

  useEffect(() => {
    if (user && open) {
      fetchRoomsAndIntegrations();
    }
  }, [user, open]);

  const fetchRoomsAndIntegrations = async () => {
    const [roomsRes, integrationsRes] = await Promise.all([
      supabase.from('rooms').select('id, name').eq('user_id', user?.id),
      supabase.from('integrations').select('id, name, type').eq('user_id', user?.id).eq('is_connected', true),
    ]);

    if (roomsRes.data) setRooms(roomsRes.data);
    if (integrationsRes.data) setIntegrations(integrationsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !type) return;

    setLoading(true);

    // Create device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert({
        user_id: user.id,
        name,
        type: type as any,
        room_id: roomId || null,
        integration_id: integrationId || null,
      })
      .select()
      .single();

    if (deviceError) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o dispositivo.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // If it's a camera, create camera record
    if (type === 'camera' && device) {
      await supabase.from('cameras').insert({
        device_id: device.id,
        stream_url: streamUrl || null,
        status: 'offline',
      });
    }

    toast({
      title: 'Dispositivo adicionado!',
      description: `${name} foi adicionado com sucesso.`,
    });

    // Reset form
    setName('');
    setType('');
    setRoomId('');
    setIntegrationId('');
    setStreamUrl('');
    setLoading(false);
    onOpenChange(false);
    onDeviceAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50">
        <DialogHeader>
          <DialogTitle>Adicionar Dispositivo</DialogTitle>
          <DialogDescription>
            Preencha as informações do novo dispositivo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do dispositivo</Label>
            <Input
              id="name"
              placeholder="Ex: Luz da Sala"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    <div className="flex items-center gap-2">
                      <dt.icon className="w-4 h-4" />
                      {dt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cômodo (opcional)</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cômodo" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Integração (opcional)</Label>
            <Select value={integrationId} onValueChange={setIntegrationId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma integração" />
              </SelectTrigger>
              <SelectContent>
                {integrations.map((int) => (
                  <SelectItem key={int.id} value={int.id}>
                    {int.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'camera' && (
            <div className="space-y-2">
              <Label htmlFor="streamUrl">URL do Stream (opcional)</Label>
              <Input
                id="streamUrl"
                placeholder="rtsp://... ou http://..."
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !name || !type}>
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;
