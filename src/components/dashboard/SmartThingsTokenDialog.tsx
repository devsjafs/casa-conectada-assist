import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Loader2, Key } from 'lucide-react';

interface SmartThingsTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SmartThingsTokenDialog = ({ open, onOpenChange, onSuccess }: SmartThingsTokenDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !token.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira o Personal Access Token.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to validate token and fetch devices
      const { data, error } = await supabase.functions.invoke('smartthings-sync', {
        body: { 
          token: token.trim(),
          userId: user.id 
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'SmartThings conectado!',
        description: `${data.devicesImported || 0} dispositivo(s) importado(s) com sucesso.`,
      });

      setToken('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('SmartThings sync error:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Verifique se o token está correto e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Conectar SmartThings
          </DialogTitle>
          <DialogDescription>
            Use um Personal Access Token (PAT) para importar seus dispositivos SmartThings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Personal Access Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Cole seu token aqui..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="glass rounded-lg p-3 text-sm space-y-2">
            <p className="font-medium">Como obter o token:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Acesse o site da Samsung SmartThings</li>
              <li>Vá em "Personal Access Tokens"</li>
              <li>Crie um novo token com permissões de dispositivos</li>
              <li>Copie e cole o token acima</li>
            </ol>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => window.open('https://account.smartthings.com/tokens', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Abrir SmartThings Tokens
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !token.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Conectar e Importar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SmartThingsTokenDialog;
