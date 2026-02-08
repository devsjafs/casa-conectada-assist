import { useState } from 'react';
import { Settings, LogOut, Home, Plug } from 'lucide-react';
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
import SettingsDialog from './SettingsDialog';

interface HeaderProps {
  onOpenIntegrations?: () => void;
  onMembersUpdated?: () => void;
}

const Header = ({ onOpenIntegrations, onMembersUpdated }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  
  const currentTime = new Date().toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const currentDate = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="glass sticky top-0 z-50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20 glow-primary">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gradient">Smart Home</h1>
              <p className="text-xs text-muted-foreground">Casa Conectada</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center">
          <span className="text-3xl font-light tracking-tight">{currentTime}</span>
          <span className="text-sm text-muted-foreground capitalize">{currentDate}</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenIntegrations && (
            <Button variant="ghost" size="icon" onClick={onOpenIntegrations} title="Integrações">
              <Plug className="w-5 h-5" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
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
