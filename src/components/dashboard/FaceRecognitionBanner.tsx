import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanFace, User, Loader2, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';

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

const BUFFER_SIZE = 3;
const DETECTION_INTERVAL = 5000; // 5 seconds between detections

const FaceRecognitionBanner = ({ 
  members, 
  onMemberRecognized,
  recognizedMemberId 
}: FaceRecognitionBannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const detectionBufferRef = useRef<(string | null)[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(false);

  const { modelReady, modelLoading, modelError, computeEmbedding, findBestMatch } = useFaceRecognition();

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

  // Real face detection using ViT embeddings
  const detectFace = useCallback(async () => {
    if (
      !videoRef.current || 
      !canvasRef.current || 
      processingRef.current || 
      !isActive || 
      !modelReady
    ) return;

    // Check if any member has embeddings
    const membersWithEmbeddings = members.filter(
      m => m.face_embedding && Array.isArray(m.face_embedding) && m.face_embedding.length > 0
    );

    if (membersWithEmbeddings.length === 0) {
      // No embeddings to compare against
      if (recognizedMemberId !== null) {
        onMemberRecognized(null);
      }
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState !== 4) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      const embedding = await computeEmbedding(dataUrl);
      if (!embedding) return;

      const match = findBestMatch(embedding, membersWithEmbeddings);
      const detectedId = match ? match.memberId : null;

      // Add to stability buffer
      detectionBufferRef.current.push(detectedId);
      if (detectionBufferRef.current.length > BUFFER_SIZE) {
        detectionBufferRef.current.shift();
      }

      // Only change if we have enough consistent readings
      if (detectionBufferRef.current.length >= 2) {
        const counts = new Map<string | null, number>();
        for (const id of detectionBufferRef.current) {
          counts.set(id, (counts.get(id) || 0) + 1);
        }
        
        let stableId: string | null = null;
        let maxCount = 0;
        for (const [id, count] of counts) {
          if (count > maxCount) {
            maxCount = count;
            stableId = id;
          }
        }

        // Need at least 2 consistent readings to change
        if (maxCount >= 2 && stableId !== recognizedMemberId) {
          console.log(`[FaceRecognition] Stable detection: ${stableId ? members.find(m => m.id === stableId)?.name : 'Ninguém'} (${maxCount}/${BUFFER_SIZE})`);
          onMemberRecognized(stableId);
        }
      }
    } catch (err) {
      console.error('[FaceRecognition] Detection error:', err);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [members, isActive, modelReady, computeEmbedding, findBestMatch, recognizedMemberId, onMemberRecognized]);

  // Continuous detection every 5 seconds
  useEffect(() => {
    if (!isActive || !modelReady) return;
    const interval = setInterval(detectFace, DETECTION_INTERVAL);
    return () => clearInterval(interval);
  }, [isActive, modelReady, detectFace]);

  if (error) return null;

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
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex-1 min-w-0">
        {modelLoading ? (
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary animate-pulse shrink-0" />
            <span className="text-xs text-muted-foreground truncate">Carregando modelo IA...</span>
          </div>
        ) : modelError ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive truncate">{modelError}</span>
          </div>
        ) : recognizedMember ? (
          <div className="flex items-center gap-2">
            <ScanFace className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{recognizedMember.name}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
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
