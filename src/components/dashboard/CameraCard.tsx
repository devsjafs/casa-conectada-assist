import { Camera, Trash2, WifiOff, Settings, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const [urlInput, setUrlInput] = useState(camera.streamUrl || '');
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const refreshInterval = useRef<ReturnType<typeof setInterval>>();

  const streamUrl = camera.streamUrl;
  const isHttpStream = streamUrl?.startsWith('http');

  // Auto-refresh snapshot every 10s for HTTP streams
  useEffect(() => {
    if (isHttpStream) {
      refreshInterval.current = setInterval(() => {
        setImgKey(k => k + 1);
        setImgError(false);
      }, 10000);
      return () => clearInterval(refreshInterval.current);
    }
  }, [isHttpStream]);

  const handleSave = async () => {
    if (!urlInput.trim() || !onConfigureStream) return;
    setSaving(true);
    await onConfigureStream(camera.id, urlInput.trim());
    setImgError(false);
    setImgKey(k => k + 1);
    setSaving(false);
    setShowConfig(false);
  };

  const renderStream = () => {
    // No stream configured
    if (!streamUrl) {
      return (
        <button
          className="w-full h-full bg-muted/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => setShowConfig(true)}
        >
          <WifiOff className="w-8 h-8 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground/60">Toque para configurar</span>
        </button>
      );
    }

    // HTTP stream - try to display as image or iframe
    if (isHttpStream) {
      if (imgError) {
        return (
          <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center gap-1.5">
            <WifiOff className="w-6 h-6 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/60 px-2 text-center">
              Não foi possível carregar
            </span>
            <button
              className="text-[10px] text-primary underline"
              onClick={() => { setImgError(false); setImgKey(k => k + 1); }}
            >
              Tentar novamente
            </button>
          </div>
        );
      }

      // Try as img first (works for MJPEG streams and snapshots)
      const separator = streamUrl.includes('?') ? '&' : '?';
      return (
        <img
          key={imgKey}
          src={`${streamUrl}${separator}_t=${imgKey}`}
          alt={camera.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      );
    }

    // RTSP - can't display in browser, show info
    return (
      <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center gap-1 px-2">
        <Camera className="w-6 h-6 text-primary" />
        <span className="text-[9px] text-muted-foreground text-center leading-tight">
          RTSP configurado
        </span>
        <span className="text-[8px] text-muted-foreground/60 text-center font-mono truncate w-full">
          {streamUrl}
        </span>
      </div>
    );
  };

  return (
    <>
      <div
        className="glass rounded-2xl overflow-hidden transition-all duration-200 relative group"
        onContextMenu={(e) => { e.preventDefault(); setShowDelete(s => !s); }}
      >
        <div className="aspect-[16/10] relative">
          {renderStream()}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />

          {/* Status dot */}
          <div className="absolute top-2 right-2">
            <span className={cn(
              "w-2 h-2 rounded-full block",
              camera.status === 'online' ? "bg-success animate-pulse" : "bg-destructive"
            )} />
          </div>

          {/* Config/refresh buttons */}
          <div className="absolute top-2 right-7 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isHttpStream && (
              <button
                className="p-1.5 rounded-full bg-muted/60 text-foreground"
                onClick={() => { setImgError(false); setImgKey(k => k + 1); }}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
            {onConfigureStream && (
              <button
                className="p-1.5 rounded-full bg-muted/60 text-foreground"
                onClick={(e) => { e.stopPropagation(); setShowConfig(true); }}
              >
                <Settings className="w-3 h-3" />
              </button>
            )}
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

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Câmera - {camera.name}</DialogTitle>
            <DialogDescription>
              Configure a URL de stream para exibir o feed da câmera no dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Stream</Label>
              <Input
                placeholder="http://192.168.1.100:1984/api/stream.mjpeg?src=camera1"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="text-xs text-muted-foreground space-y-2 bg-muted/30 p-3 rounded-lg">
              <p className="font-medium text-foreground">Como ver a câmera Tapo C200:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Instale o <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener" className="text-primary underline">go2rtc</a> no seu PC/servidor local</li>
                <li>Configure a câmera no go2rtc com a URL RTSP:
                  <code className="block bg-background/50 p-1 mt-1 rounded text-[10px] break-all">
                    rtsp://usuario:senha@IP:554/stream1
                  </code>
                </li>
                <li>Use a URL do go2rtc aqui:
                  <code className="block bg-background/50 p-1 mt-1 rounded text-[10px] break-all">
                    http://IP_DO_GO2RTC:1984/api/frame.jpeg?src=camera1
                  </code>
                </li>
              </ol>
            </div>

            <Button onClick={handleSave} disabled={!urlInput.trim() || saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CameraCard;
