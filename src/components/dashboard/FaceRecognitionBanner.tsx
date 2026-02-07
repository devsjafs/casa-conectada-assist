import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanFace, User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
  face_embedding: any;
}

interface FaceRecognitionBannerProps {
  members: HouseholdMember[];
  onMemberRecognized: (memberId: string | null) => void;
  recognizedMemberId: string | null;
}

const FaceRecognitionBanner = ({ 
  members, 
  onMemberRecognized,
  recognizedMemberId 
}: FaceRecognitionBannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(false);

  const recognizedMember = members.find(m => m.id === recognizedMemberId) || null;

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // Face detection simulation - runs continuously
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isActive) return;
    
    setIsProcessing(true);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && videoRef.current.readyState === 4) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Placeholder: randomly pick a member or null (simulating no one detected)
      const membersWithPhotos = members.filter(m => m.avatar_url);
      if (membersWithPhotos.length > 0) {
        // 70% chance to detect someone, 30% chance no one
        if (Math.random() > 0.3) {
          const member = membersWithPhotos[Math.floor(Math.random() * membersWithPhotos.length)];
          onMemberRecognized(member.id);
        } else {
          onMemberRecognized(null);
        }
      } else {
        onMemberRecognized(null);
      }
    }
    setIsProcessing(false);
  }, [members, isActive, isProcessing, onMemberRecognized]);

  // Continuous detection every 3 seconds
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(detectFace, 3000);
    return () => clearInterval(interval);
  }, [isActive, detectFace]);

  if (error) return null; // Hide if camera fails

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30">
      {/* Tiny camera preview */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0 ring-2 ring-offset-2 ring-offset-background ring-primary/50">
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex-1 min-w-0">
        {recognizedMember ? (
          <div className="flex items-center gap-2">
            <ScanFace className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium truncate">{recognizedMember.name}</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs shrink-0">
              Ativo
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">Observando...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRecognitionBanner;
