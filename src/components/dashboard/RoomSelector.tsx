import { Sofa, Bed, CookingPot, Bath, Monitor, Home, Car, Trees, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Room {
  id: string;
  name: string;
  icon: string;
}

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
  home: Home,
  car: Car,
  trees: Trees,
  dumbbell: Dumbbell,
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
        const Icon = roomIcons[room.icon] || Home;
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
          </Button>
        );
      })}
    </div>
  );
};

export default RoomSelector;
