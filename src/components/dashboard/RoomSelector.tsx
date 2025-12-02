import { Sofa, Bed, CookingPot, Bath, Monitor, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Room } from '@/data/mockData';

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoom: string | null;
  onSelectRoom: (roomId: string | null) => void;
}

const roomIcons: Record<string, React.ElementType> = {
  sofa: Sofa,
  bed: Bed,
  'cooking-pot': CookingPot,
  bath: Bath,
  monitor: Monitor,
};

const RoomSelector = ({ rooms, selectedRoom, onSelectRoom }: RoomSelectorProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Button
        variant={selectedRoom === null ? "default" : "secondary"}
        className={cn(
          "flex items-center gap-2 shrink-0",
          selectedRoom === null && "glow-primary"
        )}
        onClick={() => onSelectRoom(null)}
      >
        <Home className="w-4 h-4" />
        Todos
      </Button>
      
      {rooms.map((room) => {
        const Icon = roomIcons[room.icon] || Sofa;
        const isSelected = selectedRoom === room.id;
        
        return (
          <Button
            key={room.id}
            variant={isSelected ? "default" : "secondary"}
            className={cn(
              "flex items-center gap-2 shrink-0",
              isSelected && "glow-primary"
            )}
            onClick={() => onSelectRoom(room.id)}
          >
            <Icon className="w-4 h-4" />
            {room.name}
            {room.temperature && (
              <span className="text-xs opacity-70">{room.temperature}°C</span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default RoomSelector;
