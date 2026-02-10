import { Sofa, Bed, CookingPot, Bath, Monitor, Home, Car, Trees, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <button
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0",
          selectedRoom === null 
            ? "bg-primary text-primary-foreground" 
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
        onClick={() => onSelectRoom(null)}
      >
        <Home className="w-3.5 h-3.5" />
        Todos
      </button>
      
      {rooms.map((room) => {
        const Icon = roomIcons[room.icon] || Home;
        const isSelected = selectedRoom === room.id;
        
        return (
          <button
            key={room.id}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0",
              isSelected 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            onClick={() => onSelectRoom(room.id)}
          >
            <Icon className="w-3.5 h-3.5" />
            {room.name}
          </button>
        );
      })}
    </div>
  );
};

export default RoomSelector;
