import { useState } from 'react';
import { Tv, Wind, Speaker, Fan, Power, ChevronRight } from 'lucide-react';
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
  const modeLabel = mode === 'cool' ? 'Frio' : mode === 'heat' ? 'Quente' : mode === 'dry' ? 'Seco' : mode === 'fan' ? 'Vento' : 'Auto';

  return (
    <>
      <div 
        className={cn(
          "glass rounded-2xl p-3 transition-all duration-200 cursor-pointer select-none",
          device.isOn 
            ? "ring-1 ring-accent/30 bg-accent/5" 
            : "opacity-70"
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl transition-colors",
            device.isOn ? "bg-accent/20" : "bg-secondary"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              device.isOn ? "text-accent" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{device.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{device.room}</p>
          </div>
          
          {device.type === 'ac' && device.isOn ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm font-semibold">{temperature}°</span>
              <span className="text-[10px] text-muted-foreground">{modeLabel}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          ) : (
            <Button 
              variant={device.isOn ? "default" : "secondary"}
              size="icon"
              className="h-7 w-7 rounded-full shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(device.id);
              }}
            >
              <Power className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

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
