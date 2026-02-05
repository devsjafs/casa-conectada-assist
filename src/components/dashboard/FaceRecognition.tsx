import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, User, Loader2, RefreshCw, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
  face_embedding: any;
}

interface FaceRecognitionProps {
  members: HouseholdMember[];
  onMemberRecognized: (memberId: string | null) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const FaceRecognition = ({ members, onMemberRecognized, enabled, onToggle }: FaceRecognitionProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [recognizedMember, setRecognizedMember] = useState<HouseholdMember | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 320 },
          height: { ideal: 240 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err) {
      setError('Não foi possível acessar a câmera');
      toast({
        title: 'Erro na câmera',
        description: 'Verifique as permissões do navegador.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setRecognizedMember(null);
    onMemberRecognized(null);
  }, [onMemberRecognized]);

  // Start/stop camera when enabled changes
  useEffect(() => {
    if (enabled && !isActive) {
      startCamera();
    } else if (!enabled && isActive) {
      stopCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled, isActive, startCamera, stopCamera]);

  // Simple face detection simulation (placeholder for real ML model)
  // In production, this would use @huggingface/transformers for face embedding comparison
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isActive) return;
    
    setIsProcessing(true);
    
    // Draw current frame to canvas
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && videoRef.current.readyState === 4) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      // For now, we'll simulate face recognition by checking if members have photos
      // Real implementation would use face-api.js or HuggingFace transformers
      // to compare face embeddings
      
      // Placeholder: randomly select a member with an avatar for demo
      const membersWithPhotos = members.filter(m => m.avatar_url);
      if (membersWithPhotos.length > 0) {
        // In real implementation, we'd compare face embeddings here
        // For demo, we'll cycle through recognized members every 5 seconds
        const randomMember = membersWithPhotos[Math.floor(Math.random() * membersWithPhotos.length)];
        setRecognizedMember(randomMember);
        onMemberRecognized(randomMember.id);
      } else {
        setRecognizedMember(null);
        onMemberRecognized(null);
      }
    }
    
    setIsProcessing(false);
  }, [members, isActive, isProcessing, onMemberRecognized]);

  // Run face detection periodically
  useEffect(() => {
    if (!isActive || !enabled) return;
    
    const interval = setInterval(detectFace, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isActive, enabled, detectFace]);

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Reconhecimento Facial</h3>
        </div>
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(!enabled)}
        >
          {enabled ? (
            <>
              <Power className="w-4 h-4 mr-1" />
              Ativo
            </>
          ) : (
            <>
              <PowerOff className="w-4 h-4 mr-1" />
              Inativo
            </>
          )}
        </Button>
      </div>

      {enabled && (
        <div className="space-y-3">
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">{error}</p>
                  <Button size="sm" variant="outline" onClick={startCamera}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {!isActive && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Recognition status */}
          <div className={cn(
            "p-3 rounded-lg border transition-colors",
            recognizedMember 
              ? "bg-success/10 border-success/30" 
              : "bg-muted/30 border-border/30"
          )}>
            {recognizedMember ? (
              <div className="flex items-center gap-3">
                {recognizedMember.avatar_url ? (
                  <img 
                    src={recognizedMember.avatar_url} 
                    alt={recognizedMember.name}
                    className="w-10 h-10 rounded-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">Olá, {recognizedMember.name}!</p>
                  <p className="text-xs text-muted-foreground">Mostrando suas notificações</p>
                </div>
                <Badge variant="secondary" className="ml-auto bg-success/20 text-success">
                  Reconhecido
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Aguardando...</p>
                  <p className="text-xs">Posicione-se em frente à câmera</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Ative para detectar automaticamente quem está em frente ao tablet
        </p>
      )}
    </div>
  );
};

export default FaceRecognition;
