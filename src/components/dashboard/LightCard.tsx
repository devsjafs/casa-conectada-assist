import { Lightbulb, Sun } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Light } from '@/data/mockData';

interface LightCardProps {
  light: Light;
  onToggle: (id: string) => void;
  onBrightnessChange: (id: string, brightness: number) => void;
}

const brandColors = {
  tuya: 'text-orange-400',
  positivo: 'text-green-400',
  smartthings: 'text-blue-400',
};

const LightCard = ({ light, onToggle, onBrightnessChange }: LightCardProps) => {
  const [localBrightness, setLocalBrightness] = useState(light.brightness);

  const handleBrightnessChange = (value: number[]) => {
    setLocalBrightness(value[0]);
    onBrightnessChange(light.id, value[0]);
  };

  return (
    <div className={cn(
      "glass rounded-xl p-4 transition-all duration-300",
      light.isOn && "glow-primary"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300",
          light.isOn 
            ? "bg-primary/20" 
            : "bg-secondary"
        )}>
          <Lightbulb 
            className={cn(
              "w-6 h-6 transition-all duration-300",
              light.isOn ? "text-primary" : "text-muted-foreground"
            )} 
            fill={light.isOn ? light.color || 'hsl(var(--primary))' : 'none'}
          />
        </div>
        <Switch 
          checked={light.isOn} 
          onCheckedChange={() => onToggle(light.id)}
        />
      </div>

      <div className="space-y-1 mb-4">
        <h3 className="font-medium text-sm">{light.name}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {light.room}
          <span className="mx-1">•</span>
          <span className={brandColors[light.brand]}>{light.brand}</span>
        </p>
      </div>

      {light.isOn && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sun className="w-3 h-3" /> Brilho
            </span>
            <span className="font-medium">{localBrightness}%</span>
          </div>
          <Slider
            value={[localBrightness]}
            onValueChange={handleBrightnessChange}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default LightCard;
