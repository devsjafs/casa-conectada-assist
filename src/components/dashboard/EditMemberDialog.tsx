import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PreferencesSelector, { type PreferencesData } from './PreferencesSelector';

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
  face_embedding: any;
  preferences: PreferencesData | null;
}

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: HouseholdMember | null;
  onMemberUpdated: () => void;
}

const EditMemberDialog = ({ open, onOpenChange, member, onMemberUpdated }: EditMemberDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [preferences, setPreferences] = useState<PreferencesData>({ music: [], sports: [], interests: [] });
  const [loading, setLoading] = useState(false);

  // Sync state when member changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && member) {
      setName(member.name);
      setPreferences({
        music: member.preferences?.music || [],
        sports: member.preferences?.sports || [],
        interests: member.preferences?.interests || [],
      });
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!member || !name.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('household_members')
        .update({
          name: name.trim(),
          preferences,
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: 'Membro atualizado!',
        description: `As preferências de ${name} foram salvas.`,
      });

      onMemberUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar {member.name}</DialogTitle>
          <DialogDescription>
            Atualize o nome e selecione as preferências.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium text-muted-foreground">
              Toque para selecionar as preferências
            </p>
            <PreferencesSelector value={preferences} onChange={setPreferences} />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()} className="flex-1">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberDialog;
