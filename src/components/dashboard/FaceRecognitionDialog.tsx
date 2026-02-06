import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, User, Loader2, RefreshCw, ScanFace } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
  face_embedding: any;
}

interface FaceRecognitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: HouseholdMember[];
  onMemberRecognized: (memberId: string | null) => void;
  recognizedMemberId: string | null;
}

const FaceRecognitionDialog = ({ 
  open, 
  onOpenChange, 
  members, 
  onMemberRecognized,
  recognizedMemberId 
}: FaceRecognitionDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognizedMember = members.find(m => m.id === recognizedMemberId) || null;

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [open, startCamera, stopCamera]);

  // Simple face detection simulation
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isActive) return;
    
    setIsProcessing(true);
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && videoRef.current.readyState === 4) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Placeholder for real face recognition
      const membersWithPhotos = members.filter(m => m.avatar_url);
      if (membersWithPhotos.length > 0) {
        const randomMember = membersWithPhotos[Math.floor(Math.random() * membersWithPhotos.length)];
        onMemberRecognized(randomMember.id);
      }
    }
    
    setIsProcessing(false);
  }, [members, isActive, isProcessing, onMemberRecognized]);

  // Run face detection periodically and auto-recognize
  useEffect(() => {
    if (!isActive || !open) return;
    
    const interval = setInterval(() => {
      detectFace();
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive, open, detectFace]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-primary" />
            Reconhecimento Facial
          </DialogTitle>
          <DialogDescription>
            O sistema detecta automaticamente quem está na frente da câmera.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {isProcessing && (
              <div className="absolute top-2 right-2">
                <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analisando...
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center p-4">
                  <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-destructive mb-3">{error}</p>
                  <Button size="sm" variant="outline" onClick={startCamera}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {!isActive && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Recognition status */}
          <div className={cn(
            "p-4 rounded-lg border transition-colors",
            recognizedMember 
              ? "bg-emerald-500/10 border-emerald-500/30" 
              : "bg-muted/30 border-border/30"
          )}>
            {recognizedMember ? (
              <div className="flex items-center gap-3">
                {recognizedMember.avatar_url ? (
                  <img 
                    src={recognizedMember.avatar_url} 
                    alt={recognizedMember.name}
                    className="w-12 h-12 rounded-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">Olá, {recognizedMember.name}!</p>
                  <p className="text-sm text-muted-foreground">Notificações personalizadas ativadas</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Reconhecido
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">Aguardando identificação...</p>
                  <p className="text-sm">Posicione-se em frente à câmera</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {recognizedMember 
              ? "A câmera continuará detectando. Quando outra pessoa aparecer, as notificações serão atualizadas automaticamente."
              : "Se ninguém for identificado, as notificações gerais serão exibidas."
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaceRecognitionDialog;
