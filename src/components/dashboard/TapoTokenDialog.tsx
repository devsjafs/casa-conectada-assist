import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogIn } from 'lucide-react';

interface TapoTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TapoTokenDialog = ({ open, onOpenChange, onSuccess }: TapoTokenDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ devices_found: number; devices_imported: number; devices: any[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim() || !password.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('tapo-login', {
        body: { email: email.trim(), password: password.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast({
        title: 'TP-Link conectado!',
        description: `${data.devices_imported} dispositivo(s) importado(s) com sucesso.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Tapo login error:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Verifique seu email e senha TP-Link.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📹</span>
            Conectar TP-Link Tapo
          </DialogTitle>
          <DialogDescription>
            Faça login com sua conta TP-Link para importar seus dispositivos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="glass rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{result.devices_imported}</p>
              <p className="text-sm text-muted-foreground">dispositivo(s) importado(s)</p>
            </div>
            {result.devices.length > 0 && (
              <div className="space-y-2">
                {result.devices.map((d, i) => (
                  <div key={i} className="glass rounded-lg p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.model} · {d.type}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.online ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                      {d.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tapoEmail">Email da conta TP-Link</Label>
              <Input
                id="tapoEmail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tapoPassword">Senha</Label>
              <Input
                id="tapoPassword"
                type="password"
                placeholder="Sua senha TP-Link"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Use o mesmo email e senha do app Tapo/Kasa. Seus dispositivos serão importados automaticamente.
            </p>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !email.trim() || !password.trim()} className="flex-1">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Conectar
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TapoTokenDialog;
