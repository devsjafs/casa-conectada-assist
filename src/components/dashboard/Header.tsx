import { useState, useEffect } from 'react';
import { Settings, LogOut, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import SettingsDialog from './SettingsDialog';

interface HeaderProps {
  onOpenIntegrations?: () => void;
  onMembersUpdated?: () => void;
  devicesCount?: number;
  onlineCount?: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const Header = ({ onOpenIntegrations, onMembersUpdated, devicesCount, onlineCount }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentTime = time.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const currentSeconds = time.toLocaleTimeString('pt-BR', { second: '2-digit' }).slice(-2);
  
  const currentDate = time.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="px-6 py-5">
      <div className="flex items-center justify-between">
        {/* Clock + greeting */}
        <div className="flex items-baseline gap-4">
          <div className="flex items-baseline">
            <span className="text-5xl font-extralight tracking-tight text-foreground">{currentTime}</span>
            <span className="text-lg font-light text-muted-foreground ml-1">{currentSeconds}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
            <p className="text-base font-medium text-foreground">{getGreeting()}, {firstName}</p>
          </div>
        </div>

        {/* Right side: stats badge + avatar */}
        <div className="flex items-center gap-3">
          {devicesCount !== undefined && onlineCount !== undefined && (
            <Badge variant="secondary" className="text-xs px-3 py-1.5 hidden sm:flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              {onlineCount}/{devicesCount} ativos
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpenIntegrations?.()}>
                <Plug className="w-4 h-4 mr-2" />
                Integrações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings}
        onMembersUpdated={onMembersUpdated}
      />
    </header>
  );
};

export default Header;
