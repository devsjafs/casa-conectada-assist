import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PREFERENCE_OPTIONS = {
  music: {
    label: '🎵 Música',
    options: [
      'Pop', 'Rock', 'MPB', 'Sertanejo', 'Funk', 'Pagode', 'Rap/Hip-Hop',
      'Eletrônica', 'Forró', 'Reggae', 'Jazz', 'Clássica', 'Gospel', 'K-Pop',
      'Indie', 'R&B', 'Axé', 'Trap', 'Lo-Fi',
    ],
  },
  sports: {
    label: '⚽ Times & Esportes',
    options: [
      'Flamengo', 'Corinthians', 'Palmeiras', 'São Paulo', 'Vasco',
      'Botafogo', 'Fluminense', 'Grêmio', 'Internacional', 'Cruzeiro',
      'Atlético-MG', 'Santos', 'Bahia', 'Athletico-PR',
      'F1', 'NBA', 'UFC/MMA', 'Tênis', 'Vôlei', 'Surf',
    ],
  },
  interests: {
    label: '⭐ Interesses',
    options: [
      'Tecnologia', 'Cinema', 'Séries', 'Games', 'Culinária', 'Moda',
      'Viagens', 'Fitness', 'Fotografia', 'Arte', 'Livros', 'Ciência',
      'Política', 'Economia', 'Investimentos', 'Inteligência Artificial',
      'Maquiagem', 'Automóveis', 'Pets', 'Anime/Mangá', 'Meio Ambiente',
    ],
  },
};

export type PreferencesData = {
  music?: string[];
  sports?: string[];
  interests?: string[];
};

interface PreferencesSelectorProps {
  value: PreferencesData;
  onChange: (value: PreferencesData) => void;
}

const PreferencesSelector = ({ value, onChange }: PreferencesSelectorProps) => {
  const toggleItem = (category: keyof PreferencesData, item: string) => {
    const current = value[category] || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    onChange({ ...value, [category]: updated });
  };

  return (
    <div className="space-y-4">
      {(Object.entries(PREFERENCE_OPTIONS) as [keyof PreferencesData, typeof PREFERENCE_OPTIONS.music][]).map(
        ([category, config]) => (
          <div key={category} className="space-y-2">
            <p className="text-sm font-medium">{config.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {config.options.map(option => {
                const isSelected = (value[category] || []).includes(option);
                return (
                  <Badge
                    key={option}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer select-none transition-all text-xs px-2.5 py-1',
                      isSelected
                        ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                        : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => toggleItem(category, option)}
                  >
                    {option}
                  </Badge>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default PreferencesSelector;
