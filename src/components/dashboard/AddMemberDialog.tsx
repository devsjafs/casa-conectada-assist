import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Camera, User, Loader2 } from 'lucide-react';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
}

const AddMemberDialog = ({ open, onOpenChange, onMemberAdded }: AddMemberDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Preferences
  const [musicGenres, setMusicGenres] = useState('');
  const [sportsTeams, setSportsTeams] = useState('');
  const [interests, setInterests] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
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

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      // Build preferences object
      const preferences = {
        music: musicGenres.split(',').map(s => s.trim()).filter(Boolean),
        sports: sportsTeams.split(',').map(s => s.trim()).filter(Boolean),
        interests: interests.split(',').map(s => s.trim()).filter(Boolean),
      };

      const { error } = await supabase.from('household_members').insert({
        user_id: user.id,
        name: name.trim(),
        avatar_url: capturedPhoto,
        face_embedding: null,
        preferences,
      });

      if (error) throw error;

      toast({
        title: 'Membro adicionado!',
        description: `${name} foi cadastrado com sucesso.`,
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
            <Label>Foto (opcional, para reconhecimento facial)</Label>
            
            {!showCamera && !capturedPhoto && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-32"
                onClick={startCamera}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8" />
                  <span>Tirar foto</span>
                </div>
              </Button>
            )}

            {showCamera && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
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
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setCapturedPhoto(null);
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
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
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
