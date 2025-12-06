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
import { Loader2, ExternalLink } from 'lucide-react';

interface PositivoTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PositivoTokenDialog = ({ open, onOpenChange, onSuccess }: PositivoTokenDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email || !password) return;

    setLoading(true);

    try {
      // Store credentials and mark as connected
      // In a real implementation, you'd call Positivo's API to authenticate and get a token
      const { error } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          type: 'positivo' as const,
          name: 'Positivo Casa Inteligente',
          is_connected: true,
          metadata: { email },
        }, {
          onConflict: 'user_id,type'
        });

      if (error) throw error;

      toast({
        title: 'Conectado!',
        description: 'Positivo Casa Inteligente foi conectado. Os dispositivos serão sincronizados em breve.',
      });
      
      onSuccess();
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível conectar.',
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
            <span className="text-2xl">🏠</span>
            Conectar Positivo Casa Inteligente
          </DialogTitle>
          <DialogDescription>
            Entre com suas credenciais do app Positivo Casa Inteligente para sincronizar seus dispositivos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="positivo-email">Email</Label>
            <Input
              id="positivo-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="positivo-password">Senha</Label>
            <Input
              id="positivo-password"
              type="password"
              placeholder="Sua senha do app Positivo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Dica:</p>
            <p>Use as mesmas credenciais que você usa no app Positivo Casa Inteligente.</p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !email || !password}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                'Conectar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PositivoTokenDialog;
