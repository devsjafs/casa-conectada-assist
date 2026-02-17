import { Camera, Trash2, WifiOff, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CameraType {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  thumbnail: string | null;
  streamUrl: string | null;
}

interface CameraCardProps {
  camera: CameraType;
  onDelete?: (id: string) => void;
  onConfigureStream?: (cameraId: string, streamUrl: string) => void;
}

const CameraCard = ({ camera, onDelete, onConfigureStream }: CameraCardProps) => {
  const [showDelete, setShowDelete] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [localIp, setLocalIp] = useState('');
  const [saving, setSaving] = useState(false);

  const hasStream = !!camera.streamUrl;

  const handleSaveIp = async () => {
    if (!localIp.trim() || !onConfigureStream) return;
    setSaving(true);
    const ip = localIp.trim();
    const streamUrl = `rtsp://${ip}:554/stream1`;
    await onConfigureStream(camera.id, streamUrl);
    setSaving(false);
    setShowConfig(false);
  };

  return (
    <>
      <div 
        className="glass rounded-2xl overflow-hidden transition-all duration-200 relative group"
        onContextMenu={(e) => { e.preventDefault(); setShowDelete(s => !s); }}
      >
        <div className="aspect-[16/10] relative">
          {hasStream ? (
            <div className="w-full h-full bg-muted/20 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-6 h-6 text-primary mx-auto mb-1" />
                <span className="text-[10px] text-muted-foreground">RTSP Configurado</span>
              </div>
            </div>
          ) : (
            <button
              className="w-full h-full bg-muted/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => setShowConfig(true)}
            >
              <WifiOff className="w-8 h-8 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/60">Toque para configurar IP</span>
            </button>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
          
          {/* Status dot */}
          <div className="absolute top-2 right-2">
            <span className={cn(
              "w-2 h-2 rounded-full block",
              camera.status === 'online' ? "bg-success animate-pulse" : "bg-destructive"
            )} />
          </div>

          {/* Config button (when stream exists) */}
          {hasStream && onConfigureStream && (
            <button
              className="absolute top-2 right-7 p-1.5 rounded-full bg-muted/60 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
            >
              <Settings className="w-3 h-3" />
            </button>
          )}

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

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar IP Local - {camera.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o IP local da câmera na sua rede para gerar a URL RTSP automaticamente.
            </p>
            <Input
              placeholder="Ex: 192.168.1.100"
              value={localIp}
              onChange={(e) => setLocalIp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveIp()}
            />
            {localIp.trim() && (
              <p className="text-xs text-muted-foreground font-mono">
                rtsp://{localIp.trim()}:554/stream1
              </p>
            )}
            <Button onClick={handleSaveIp} disabled={!localIp.trim() || saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CameraCard;
