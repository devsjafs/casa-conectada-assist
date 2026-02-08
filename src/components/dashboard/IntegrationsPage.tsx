import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plug, Check, ExternalLink, Info, Unplug, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import SmartThingsTokenDialog from './SmartThingsTokenDialog';
import PositivoTokenDialog from './PositivoTokenDialog';
import AlexaTokenDialog from './AlexaTokenDialog';
import TapoTokenDialog from './TapoTokenDialog';

interface Integration {
  id: string;
  type: string;
  name: string;
  logo: string;
  description: string;
  is_connected: boolean;
  comingSoon?: boolean;
  hasOAuth?: boolean;
}

const integrationsList: Omit<Integration, 'id' | 'is_connected'>[] = [
  {
    type: 'tapo',
    name: 'TP-Link Tapo',
    logo: '📹',
    description: 'Câmeras Tapo C200 e outros dispositivos via RTSP local.',
    hasOAuth: true,
  },
  {
    type: 'tuya',
    name: 'Tuya / Smart Life',
    logo: '🔌',
    description: 'Conecte dispositivos Tuya, Smart Life e outras marcas compatíveis.',
    hasOAuth: true,
  },
  {
    type: 'smartthings',
    name: 'Samsung SmartThings',
    logo: '📱',
    description: 'Integre com dispositivos Samsung e SmartThings Hub.',
    hasOAuth: true,
  },
  {
    type: 'positivo',
    name: 'Positivo Casa Inteligente',
    logo: '🏠',
    description: 'Controle dispositivos da linha Positivo Casa Inteligente.',
    hasOAuth: true,
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
    hasOAuth: true,
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
  const [smartThingsDialogOpen, setSmartThingsDialogOpen] = useState(false);
  const [positivoDialogOpen, setPositivoDialogOpen] = useState(false);
  const [alexaDialogOpen, setAlexaDialogOpen] = useState(false);
  const [tapoDialogOpen, setTapoDialogOpen] = useState(false);

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
    
    // Open specific dialogs for each integration
    switch (integrationType) {
      case 'smartthings':
        setSmartThingsDialogOpen(true);
        return;
      case 'tapo':
        setTapoDialogOpen(true);
        return;
      case 'positivo':
        setPositivoDialogOpen(true);
        return;
      case 'alexa':
        setAlexaDialogOpen(true);
        return;
      case 'tuya':
        toast({
          title: 'Em desenvolvimento',
          description: 'A integração Tuya está sendo implementada.',
        });
        return;
      default:
        toast({
          title: 'Integração não disponível',
          description: 'Esta integração ainda não está configurada.',
        });
    }
  };

  const handleDisconnect = async (integrationType: string, integrationName: string) => {
    if (!user) return;
    
    setLoading(integrationType);
    
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('type', integrationType as any);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar a integração.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Desconectado!',
        description: `${integrationName} foi desconectado com sucesso.`,
      });
      fetchIntegrations();
    }
    
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
            Use "Login OAuth" para conectar sua conta e importar dispositivos automaticamente, 
            ou "Ativar" para adicionar dispositivos manualmente. Para OAuth funcionar, 
            as credenciais de API devem estar configuradas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                        {integration.type === 'smartthings' ? (
                            <>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Conectar OAuth
                            </>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4 mr-2" />
                              Login
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleConnect(integration.type)}
                          disabled={loading === integration.type}
                        >
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Reconectar
                        </>
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleDisconnect(integration.type, integration.name)}
                          disabled={loading === integration.type}
                        >
                          <Unplug className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <SmartThingsTokenDialog
        open={smartThingsDialogOpen}
        onOpenChange={setSmartThingsDialogOpen}
        onSuccess={fetchIntegrations}
      />
      
      <PositivoTokenDialog
        open={positivoDialogOpen}
        onOpenChange={setPositivoDialogOpen}
        onSuccess={fetchIntegrations}
      />
      
      <AlexaTokenDialog
        open={alexaDialogOpen}
        onOpenChange={setAlexaDialogOpen}
        onSuccess={fetchIntegrations}
      />
      
      <TapoTokenDialog
        open={tapoDialogOpen}
        onOpenChange={setTapoDialogOpen}
        onSuccess={fetchIntegrations}
      />
    </div>
  );
};

export default IntegrationsPage;
