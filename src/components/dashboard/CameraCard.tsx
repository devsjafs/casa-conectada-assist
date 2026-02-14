import { Camera, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CameraType {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  thumbnail: string;
}

interface CameraCardProps {
  camera: CameraType;
  onDelete?: (id: string) => void;
}

const CameraCard = ({ camera, onDelete }: CameraCardProps) => {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div 
      className="glass rounded-2xl overflow-hidden transition-all duration-200 relative group"
      onContextMenu={(e) => { e.preventDefault(); setShowDelete(s => !s); }}
    >
      <div className="aspect-[16/10] relative">
        <img 
          src={camera.thumbnail} 
          alt={camera.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Status dot */}
        <div className="absolute top-2 right-2">
          <span className={cn(
            "w-2 h-2 rounded-full block",
            camera.status === 'online' ? "bg-success animate-pulse" : "bg-destructive"
          )} />
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            className={cn(
              "absolute top-2 left-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground transition-opacity",
              showDelete ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => { e.stopPropagation(); onDelete(camera.id); }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-xs">{camera.name}</span>
          </div>
          <p className="text-[10px] text-muted-foreground ml-5">{camera.location}</p>
        </div>
      </div>
    </div>
  );
};

export default CameraCard;
