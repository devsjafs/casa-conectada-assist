import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Info } from 'lucide-react';

interface TapoTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TapoTokenDialog = ({ open, onOpenChange, onSuccess }: TapoTokenDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ipAddress, setIpAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cameraName, setCameraName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ipAddress.trim() || !username.trim() || !password.trim()) return;

    setLoading(true);
    try {
      // First, create or update the Tapo integration
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          type: 'tapo' as any,
          name: 'TP-Link Tapo',
          is_connected: true,
        }, {
          onConflict: 'user_id,type'
        })
        .select()
        .single();

      if (integrationError) throw integrationError;

      // Create the device
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .insert({
          user_id: user.id,
          integration_id: integration.id,
          name: cameraName || `Tapo ${ipAddress}`,
          type: 'camera',
          is_on: true,
          metadata: {
            ip_address: ipAddress,
            rtsp_username: username,
            rtsp_password: password,
          },
        })
        .select()
        .single();

      if (deviceError) throw deviceError;

      // Create the camera entry
      const streamUrl = `rtsp://${username}:${password}@${ipAddress}/stream1`;
      const { error: cameraError } = await supabase
        .from('cameras')
        .insert({
          device_id: device.id,
          stream_url: streamUrl,
          status: 'offline', // Will be set to online when streaming starts
        });

      if (cameraError) throw cameraError;

      toast({
        title: 'Câmera Tapo configurada!',
        description: `${cameraName || 'Câmera'} foi adicionada com sucesso.`,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error adding Tapo camera:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível configurar a câmera.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIpAddress('');
    setUsername('');
    setPassword('');
    setCameraName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📹</span>
            Adicionar Câmera Tapo
          </DialogTitle>
          <DialogDescription>
            Configure o acesso RTSP para sua câmera TP-Link Tapo.
          </DialogDescription>
        </DialogHeader>

        <div className="glass rounded-lg p-3 flex items-start gap-2 text-sm">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Como configurar:</p>
            <ol className="text-muted-foreground text-xs space-y-1 list-decimal list-inside">
              <li>Abra o app Tapo e selecione sua câmera</li>
              <li>Vá em Configurações → Avançado → Conta da Câmera</li>
              <li>Crie um usuário e senha para RTSP</li>
              <li>Anote o IP da câmera (Configurações → Dispositivo)</li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cameraName">Nome da câmera (opcional)</Label>
            <Input
              id="cameraName"
              placeholder="Ex: Câmera Sala"
              value={cameraName}
              onChange={(e) => setCameraName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipAddress">Endereço IP da câmera</Label>
            <Input
              id="ipAddress"
              placeholder="Ex: 192.168.1.100"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário RTSP</Label>
              <Input
                id="username"
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha RTSP</Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !ipAddress.trim() || !username.trim() || !password.trim()} 
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TapoTokenDialog;
