import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Camera, User, Loader2, Brain } from 'lucide-react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
}

const AddMemberDialog = ({ open, onOpenChange, onMemberAdded }: AddMemberDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { modelReady, modelLoading, computeEmbedding } = useFaceRecognition();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [computingEmbedding, setComputingEmbedding] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Preferences
  const [musicGenres, setMusicGenres] = useState('');
  const [sportsTeams, setSportsTeams] = useState('');
  const [interests, setInterests] = useState('');

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      setShowCamera(true);
      
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Erro ao acessar câmera',
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
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();

    // Compute face embedding from the captured photo
    if (modelReady) {
      setComputingEmbedding(true);
      try {
        const embedding = await computeEmbedding(dataUrl);
        setFaceEmbedding(embedding);
        if (embedding) {
          toast({
            title: 'Embedding facial gerado!',
            description: 'A IA processou a foto para reconhecimento.',
          });
        } else {
          toast({
            title: 'Aviso',
            description: 'Não foi possível gerar o embedding. O membro será salvo sem reconhecimento facial.',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Aviso',
          description: 'Erro ao processar foto. O membro será salvo sem reconhecimento facial.',
          variant: 'destructive',
        });
      } finally {
        setComputingEmbedding(false);
      }
    }
  }, [stopCamera, modelReady, computeEmbedding, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      const preferences = {
        music: musicGenres.split(',').map(s => s.trim()).filter(Boolean),
        sports: sportsTeams.split(',').map(s => s.trim()).filter(Boolean),
        interests: interests.split(',').map(s => s.trim()).filter(Boolean),
      };

      const { error } = await supabase.from('household_members').insert({
        user_id: user.id,
        name: name.trim(),
        avatar_url: capturedPhoto,
        face_embedding: faceEmbedding,
        preferences,
      });

      if (error) throw error;

      toast({
        title: 'Membro adicionado!',
        description: faceEmbedding 
          ? `${name} foi cadastrado com reconhecimento facial ativo.`
          : `${name} foi cadastrado (sem reconhecimento facial).`,
      });

      onMemberAdded();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível adicionar o membro.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setName('');
    setCapturedPhoto(null);
    setFaceEmbedding(null);
    setMusicGenres('');
    setSportsTeams('');
    setInterests('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Morador</DialogTitle>
          <DialogDescription>
            Cadastre um membro da casa para notificações personalizadas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: João"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Foto (para reconhecimento facial)</Label>
            
            {/* Model loading indicator */}
            {modelLoading && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                <Brain className="w-4 h-4 text-primary animate-pulse" />
                Carregando modelo de IA para reconhecimento...
              </div>
            )}
            
            {!showCamera && !capturedPhoto && (
              <div 
                className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={startCamera}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Clique para abrir a câmera</span>
              </div>
            )}

            {showCamera && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-background aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={stopCamera} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="button" onClick={capturePhoto} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar
                  </Button>
                </div>
              </div>
            )}

            {capturedPhoto && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden aspect-video">
                  <img 
                    src={capturedPhoto} 
                    alt="Foto capturada" 
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {computingEmbedding && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <div className="flex items-center gap-2 bg-background/90 px-4 py-2 rounded-full">
                        <Brain className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-sm">Processando rosto...</span>
                      </div>
                    </div>
                  )}
                  {faceEmbedding && !computingEmbedding && (
                    <div className="absolute bottom-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                      ✓ Rosto processado
                    </div>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setCapturedPhoto(null);
                    setFaceEmbedding(null);
                    startCamera();
                  }}
                >
                  Tirar outra foto
                </Button>
              </div>
            )}
          </div>

          {/* Preferences section */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Preferências (para notificações personalizadas)</p>
            
            <div className="space-y-2">
              <Label htmlFor="music">Gêneros musicais favoritos</Label>
              <Input
                id="music"
                placeholder="Ex: Rock, MPB, Sertanejo"
                value={musicGenres}
                onChange={(e) => setMusicGenres(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separe por vírgulas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sports">Times de futebol / esportes</Label>
              <Input
                id="sports"
                placeholder="Ex: Flamengo, Brasil"
                value={sportsTeams}
                onChange={(e) => setSportsTeams(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests">Outros interesses</Label>
              <Input
                id="interests"
                placeholder="Ex: Tecnologia, Filmes, Culinária"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || computingEmbedding || !name.trim()} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
