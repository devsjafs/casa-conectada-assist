import { Camera, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Camera as CameraType } from '@/data/mockData';

interface CameraCardProps {
  camera: CameraType;
}

const CameraCard = ({ camera }: CameraCardProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group relative rounded-xl overflow-hidden glass transition-all duration-300 hover:scale-[1.02] hover:glow-primary"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-video relative">
        <img 
          src={camera.thumbnail} 
          alt={camera.name}
          className="w-full h-full object-cover"
        />
        
        {/* Status overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {/* Live indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            camera.status === 'online' 
              ? "bg-success/20 text-success" 
              : "bg-destructive/20 text-destructive"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              camera.status === 'online' 
                ? "bg-success animate-pulse" 
                : "bg-destructive"
            )} />
            {camera.status === 'online' ? 'AO VIVO' : 'OFFLINE'}
          </span>
        </div>

        {/* Controls overlay */}
        <div className={cn(
          "absolute top-3 right-3 flex gap-2 transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button className="p-2 rounded-lg bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <div>
              <h3 className="font-medium text-sm">{camera.name}</h3>
              <p className="text-xs text-muted-foreground">{camera.location}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCard;
