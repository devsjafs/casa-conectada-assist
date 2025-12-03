import { Tv, Wind, Speaker, Fan, Power, Plus, Minus, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RemoteDevice {
  id: string;
  name: string;
  type: 'tv' | 'ac' | 'soundbar' | 'fan';
  room: string;
  isOn: boolean;
  brand: string;
  settings?: {
    temperature?: number;
    volume?: number;
    mode?: string;
  };
}

interface RemoteCardProps {
  device: RemoteDevice;
  onToggle: (id: string) => void;
  onSettingChange: (id: string, setting: string, value: number) => void;
}

const deviceIcons: Record<string, React.ElementType> = {
  tv: Tv,
  ac: Wind,
  soundbar: Speaker,
  fan: Fan,
};

const brandColors: Record<string, string> = {
  positivo: 'text-green-400',
  smartthings: 'text-blue-400',
  tuya: 'text-orange-400',
};

const RemoteCard = ({ device, onToggle, onSettingChange }: RemoteCardProps) => {
  const Icon = deviceIcons[device.type] || Tv;

  return (
    <div className={cn(
      "glass rounded-xl p-4 transition-all duration-300",
      device.isOn && "glow-accent"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300",
          device.isOn 
            ? "bg-accent/20" 
            : "bg-secondary"
        )}>
          <Icon 
            className={cn(
              "w-6 h-6 transition-all duration-300",
              device.isOn ? "text-accent" : "text-muted-foreground"
            )} 
          />
        </div>
        <Button 
          variant={device.isOn ? "default" : "secondary"}
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full transition-all",
            device.isOn && "glow-accent"
          )}
          onClick={() => onToggle(device.id)}
        >
          <Power className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1 mb-4">
        <h3 className="font-medium text-sm">{device.name}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {device.room}
          {device.brand && (
            <>
              <span className="mx-1">•</span>
              <span className={brandColors[device.brand] || 'text-muted-foreground'}>{device.brand}</span>
            </>
          )}
        </p>
      </div>

      {device.isOn && device.settings && (
        <div className="space-y-3">
          {device.type === 'ac' && device.settings.temperature !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Temperatura</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => onSettingChange(device.id, 'temperature', device.settings!.temperature! - 1)}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">
                  {device.settings.temperature}°C
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => onSettingChange(device.id, 'temperature', device.settings!.temperature! + 1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {(device.type === 'tv' || device.type === 'soundbar') && device.settings.volume !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Volume
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => onSettingChange(device.id, 'volume', Math.max(0, device.settings!.volume! - 5))}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-lg font-semibold w-8 text-center">
                  {device.settings.volume}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => onSettingChange(device.id, 'volume', Math.min(100, device.settings!.volume! + 5))}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {device.type === 'ac' && device.settings.mode && (
            <div className="flex gap-2">
              {['cool', 'heat', 'auto'].map((mode) => (
                <Button
                  key={mode}
                  variant={device.settings?.mode === mode ? "default" : "secondary"}
                  size="sm"
                  className="flex-1 text-xs capitalize"
                >
                  {mode === 'cool' ? 'Frio' : mode === 'heat' ? 'Quente' : 'Auto'}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RemoteCard;
