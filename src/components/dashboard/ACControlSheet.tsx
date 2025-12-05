import { Wind, Thermometer, Fan, Droplets, Power, Minus, Plus, Snowflake, Sun, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';

interface ACControlSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: {
    id: string;
    name: string;
    room: string;
    isOn: boolean;
    brand: string;
    settings?: {
      temperature?: number;
      mode?: string;
      fanSpeed?: string;
    };
  };
  onToggle: (id: string) => void;
  onSettingChange: (id: string, setting: string, value: number | string) => void;
}

const modes = [
  { id: 'cool', label: 'Frio', icon: Snowflake, color: 'text-blue-400' },
  { id: 'heat', label: 'Quente', icon: Sun, color: 'text-orange-400' },
  { id: 'auto', label: 'Auto', icon: Zap, color: 'text-green-400' },
  { id: 'dry', label: 'Seco', icon: Droplets, color: 'text-cyan-400' },
  { id: 'fan', label: 'Vento', icon: Fan, color: 'text-purple-400' },
];

const fanSpeeds = [
  { id: 'auto', label: 'Auto' },
  { id: 'low', label: 'Baixo' },
  { id: 'medium', label: 'Médio' },
  { id: 'high', label: 'Alto' },
];

const ACControlSheet = ({ open, onOpenChange, device, onToggle, onSettingChange }: ACControlSheetProps) => {
  const settings = device.settings || {};
  const temperature = settings.temperature ?? 24;
  const mode = settings.mode ?? 'cool';
  const fanSpeed = settings.fanSpeed ?? 'auto';

  const handleTemperatureChange = (delta: number) => {
    const newTemp = Math.min(30, Math.max(16, temperature + delta));
    onSettingChange(device.id, 'temperature', newTemp);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl",
                device.isOn ? "bg-accent/20" : "bg-secondary"
              )}>
                <Wind className={cn(
                  "w-6 h-6",
                  device.isOn ? "text-accent" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{device.name}</h3>
                <p className="text-sm text-muted-foreground">{device.room}</p>
              </div>
            </div>
            <Button
              variant={device.isOn ? "default" : "secondary"}
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full",
                device.isOn && "glow-accent"
              )}
              onClick={() => onToggle(device.id)}
            >
              <Power className="w-5 h-5" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className={cn(
          "space-y-8 transition-opacity duration-300",
          !device.isOn && "opacity-50 pointer-events-none"
        )}>
          {/* Temperature Control */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
              <Thermometer className="w-4 h-4" />
              Temperatura
            </p>
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={() => handleTemperatureChange(-1)}
              >
                <Minus className="w-6 h-6" />
              </Button>
              <div className="relative">
                <span className="text-7xl font-light tabular-nums">{temperature}</span>
                <span className="text-2xl text-muted-foreground absolute -right-8 top-2">°C</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={() => handleTemperatureChange(1)}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>
            <div className="mt-4 px-8">
              <Slider
                value={[temperature]}
                min={16}
                max={30}
                step={1}
                onValueChange={([value]) => onSettingChange(device.id, 'temperature', value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>16°C</span>
                <span>30°C</span>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Modo de Operação
            </p>
            <div className="grid grid-cols-5 gap-2">
              {modes.map((m) => {
                const Icon = m.icon;
                return (
                  <Button
                    key={m.id}
                    variant={mode === m.id ? "default" : "secondary"}
                    className={cn(
                      "flex-col h-auto py-3 gap-1",
                      mode === m.id && "ring-2 ring-accent"
                    )}
                    onClick={() => onSettingChange(device.id, 'mode', m.id)}
                  >
                    <Icon className={cn("w-5 h-5", mode === m.id ? "text-primary-foreground" : m.color)} />
                    <span className="text-xs">{m.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Fan Speed */}
          <div>
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Fan className="w-4 h-4" />
              Velocidade do Vento
            </p>
            <div className="grid grid-cols-4 gap-2">
              {fanSpeeds.map((speed) => (
                <Button
                  key={speed.id}
                  variant={fanSpeed === speed.id ? "default" : "secondary"}
                  className={cn(
                    "h-12",
                    fanSpeed === speed.id && "ring-2 ring-accent"
                  )}
                  onClick={() => onSettingChange(device.id, 'fanSpeed', speed.id)}
                >
                  {speed.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-semibold">{temperature}°C</p>
              <p className="text-xs text-muted-foreground">Temperatura</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold capitalize">{modes.find(m => m.id === mode)?.label}</p>
              <p className="text-xs text-muted-foreground">Modo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold capitalize">{fanSpeeds.find(s => s.id === fanSpeed)?.label}</p>
              <p className="text-xs text-muted-foreground">Vento</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ACControlSheet;
