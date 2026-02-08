import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface SmartThingsTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SmartThingsTokenDialog = ({ open, onOpenChange, onSuccess }: SmartThingsTokenDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check if already connected
  useEffect(() => {
    if (open && user) {
      checkConnection();
    }
  }, [open, user]);

  // Listen for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const smartthingsStatus = params.get('smartthings');

    if (smartthingsStatus === 'connected') {
      toast({
        title: 'SmartThings conectado!',
        description: 'Sua conta foi vinculada e os dispositivos foram importados.',
      });
      onSuccess();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (smartthingsStatus === 'error') {
      const message = params.get('message') || 'Erro desconhecido';
      toast({
        title: 'Erro ao conectar SmartThings',
        description: `Falha na autenticação: ${message}`,
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkConnection = async () => {
    const { data } = await supabase
      .from('smartthings_connections')
      .select('id, expires_at')
      .eq('user_id', user?.id)
      .maybeSingle();

    setIsConnected(!!data);
  };

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('smartthings-auth-start', {
        body: { redirectUrl: window.location.origin },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        // Redirect to SmartThings OAuth
        window.location.href = data.url;
      } else {
        throw new Error('URL de autorização não retornada');
      }
    } catch (error: any) {
      console.error('SmartThings auth error:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Não foi possível iniciar a autenticação.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📱 Conectar SmartThings
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta Samsung SmartThings para importar e controlar seus dispositivos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isConnected && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium">SmartThings já está conectado</span>
            </div>
          )}

          <div className="glass rounded-lg p-3 text-sm space-y-2">
            <p className="font-medium">Como funciona:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Clique em "Conectar" abaixo</li>
              <li>Faça login na sua conta Samsung</li>
              <li>Autorize o acesso aos dispositivos</li>
              <li>Seus dispositivos serão importados automaticamente</li>
            </ol>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              O token é renovado automaticamente. Você só precisa conectar uma vez.
            </p>
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
            <Button onClick={handleConnect} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {isConnected ? 'Reconectar' : 'Conectar SmartThings'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartThingsTokenDialog;
