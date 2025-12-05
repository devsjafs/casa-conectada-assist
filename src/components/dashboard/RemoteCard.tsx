import { useState } from 'react';
import { Tv, Wind, Speaker, Fan, Power, Plus, Minus, Volume2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ACControlSheet from './ACControlSheet';

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
    fanSpeed?: string;
  };
}

interface RemoteCardProps {
  device: RemoteDevice;
  onToggle: (id: string) => void;
  onSettingChange: (id: string, setting: string, value: number | string) => void;
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
  const [showACControl, setShowACControl] = useState(false);
  const Icon = deviceIcons[device.type] || Tv;

  const handleCardClick = () => {
    if (device.type === 'ac') {
      setShowACControl(true);
    }
  };

  const temperature = device.settings?.temperature ?? 24;
  const mode = device.settings?.mode ?? 'cool';

  return (
    <>
      <div 
        className={cn(
          "glass rounded-xl p-4 transition-all duration-300 cursor-pointer hover:scale-[1.02]",
          device.isOn && "glow-accent"
        )}
        onClick={handleCardClick}
      >
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
            onClick={(e) => {
              e.stopPropagation();
              onToggle(device.id);
            }}
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

        {/* AC Quick Info */}
        {device.type === 'ac' && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-lg font-semibold",
                device.isOn ? "text-foreground" : "text-muted-foreground"
              )}>
                {temperature}°C
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {mode === 'cool' ? 'Frio' : mode === 'heat' ? 'Quente' : mode === 'dry' ? 'Seco' : mode === 'fan' ? 'Vento' : 'Auto'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {/* TV/Soundbar Volume Controls */}
        {device.isOn && (device.type === 'tv' || device.type === 'soundbar') && device.settings?.volume !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Volume
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingChange(device.id, 'volume', Math.max(0, device.settings!.volume! - 5));
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingChange(device.id, 'volume', Math.min(100, device.settings!.volume! + 5));
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* AC Control Sheet */}
      {device.type === 'ac' && (
        <ACControlSheet
          open={showACControl}
          onOpenChange={setShowACControl}
          device={device}
          onToggle={onToggle}
          onSettingChange={onSettingChange}
        />
      )}
    </>
  );
};

export default RemoteCard;
