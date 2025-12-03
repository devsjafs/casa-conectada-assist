import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plug, Check, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  type: string;
  name: string;
  logo: string;
  description: string;
  is_connected: boolean;
  comingSoon?: boolean;
}

const integrationsList: Omit<Integration, 'id' | 'is_connected'>[] = [
  {
    type: 'tuya',
    name: 'Tuya / Smart Life',
    logo: '🔌',
    description: 'Conecte dispositivos Tuya, Smart Life e outras marcas compatíveis.',
  },
  {
    type: 'smartthings',
    name: 'Samsung SmartThings',
    logo: '📱',
    description: 'Integre com dispositivos Samsung e SmartThings Hub.',
  },
  {
    type: 'positivo',
    name: 'Positivo Casa Inteligente',
    logo: '🏠',
    description: 'Controle dispositivos da linha Positivo Casa Inteligente.',
  },
  {
    type: 'samsung',
    name: 'Samsung Account',
    logo: '📺',
    description: 'TVs, ar condicionados e outros dispositivos Samsung.',
    comingSoon: true,
  },
  {
    type: 'google_home',
    name: 'Google Home',
    logo: '🎙️',
    description: 'Integração com dispositivos Google Nest e compatíveis.',
    comingSoon: true,
  },
  {
    type: 'alexa',
    name: 'Amazon Alexa',
    logo: '🔵',
    description: 'Controle dispositivos conectados à Alexa.',
    comingSoon: true,
  },
];

interface IntegrationsPageProps {
  onBack: () => void;
}

const IntegrationsPage = ({ onBack }: IntegrationsPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchIntegrations();
    }
  }, [user]);

  const fetchIntegrations = async () => {
    const { data, error } = await supabase
      .from('integrations')
      .select('type, is_connected')
      .eq('user_id', user?.id);

    if (!error && data) {
      const connected: Record<string, boolean> = {};
      data.forEach((i) => {
        connected[i.type] = i.is_connected ?? false;
      });
      setIntegrations(connected);
    }
  };

  const handleConnect = async (integrationType: string) => {
    if (!user) return;
    
    setLoading(integrationType);
    
    // For now, simulate a connection - in production, this would open OAuth flow
    toast({
      title: 'Em breve!',
      description: 'A integração OAuth será implementada em uma próxima versão. Por enquanto, você pode adicionar dispositivos manualmente.',
    });
    
    setLoading(null);
  };

  const handleAddManually = async (integrationType: string, integrationName: string) => {
    if (!user) return;
    
    // Create integration if it doesn't exist
    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id: user.id,
        type: integrationType as any,
        name: integrationName,
        is_connected: true,
      }, {
        onConflict: 'user_id,type'
      });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar a integração.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Integração ativada!',
        description: `${integrationName} foi ativado. Agora você pode adicionar dispositivos.`,
      });
      fetchIntegrations();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrações</h2>
          <p className="text-muted-foreground">Conecte suas contas para importar dispositivos automaticamente</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="glass rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Como funciona?</p>
          <p className="text-muted-foreground">
            Ative uma integração para começar a adicionar dispositivos daquela plataforma. 
            Em breve, você poderá fazer login com OAuth para importar dispositivos automaticamente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrationsList.map((integration) => {
          const isConnected = integrations[integration.type];
          
          return (
            <Card 
              key={integration.type} 
              className={cn(
                "glass transition-all duration-300",
                isConnected && "glow-success border-success/30"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{integration.logo}</span>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      {isConnected && (
                        <Badge variant="secondary" className="mt-1 bg-success/20 text-success">
                          <Check className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      )}
                      {integration.comingSoon && (
                        <Badge variant="secondary" className="mt-1">
                          Em breve
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{integration.description}</CardDescription>
                
                {!integration.comingSoon && (
                  <div className="flex gap-2">
                    {!isConnected ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleAddManually(integration.type, integration.name)}
                        >
                          <Plug className="w-4 h-4 mr-2" />
                          Ativar
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => handleConnect(integration.type)}
                          disabled={loading === integration.type}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Login OAuth
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => handleConnect(integration.type)}>
                        Reconectar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default IntegrationsPage;
