import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraType {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  thumbnail: string;
}

interface CameraCardProps {
  camera: CameraType;
}

const CameraCard = ({ camera }: CameraCardProps) => {
  return (
    <div className="glass rounded-2xl overflow-hidden transition-all duration-200">
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
