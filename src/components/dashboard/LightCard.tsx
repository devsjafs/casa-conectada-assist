import { Lightbulb, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface Light {
  id: string;
  name: string;
  room: string;
  isOn: boolean;
  brightness: number;
  color?: string;
  brand: string;
}

interface LightCardProps {
  light: Light;
  onToggle: (id: string) => void;
  onBrightnessChange: (id: string, brightness: number) => void;
  onDelete?: (id: string) => void;
}

const LightCard = ({ light, onToggle, onBrightnessChange, onDelete }: LightCardProps) => {
  const [localBrightness, setLocalBrightness] = useState(light.brightness);

  const handleBrightnessChange = (value: number[]) => {
    setLocalBrightness(value[0]);
    onBrightnessChange(light.id, value[0]);
  };

  return (
    <div
      className={cn(
        "glass rounded-2xl p-3 transition-all duration-200 cursor-pointer select-none relative group",
        light.isOn 
          ? "ring-1 ring-primary/30 bg-primary/5" 
          : "opacity-70"
      )}
      onClick={() => onToggle(light.id)}
    >
      {onDelete && (
        <button
          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => { e.stopPropagation(); onDelete(light.id); }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "p-2 rounded-xl transition-colors",
          light.isOn ? "bg-primary/20" : "bg-secondary"
        )}>
          <Lightbulb 
            className={cn(
              "w-5 h-5",
              light.isOn ? "text-primary" : "text-muted-foreground"
            )} 
            fill={light.isOn ? light.color || 'hsl(var(--primary))' : 'none'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{light.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{light.room}</p>
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          light.isOn 
            ? "bg-success/20 text-success" 
            : "bg-muted text-muted-foreground"
        )}>
          {light.isOn ? `${localBrightness}%` : 'OFF'}
        </span>
      </div>

      {light.isOn && (
        <div onClick={(e) => e.stopPropagation()} className="px-1">
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
