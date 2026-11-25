import { Tag, type IconName, type TagTone } from '@/shared/ui';

import type { DisplayBadge } from '../services/profileService';

const looks: Record<DisplayBadge, { label: string; tone: TagTone; icon?: IconName }> = {
  nouveau: { label: 'Nouveau', tone: 'info' },
  verifie: { label: 'Vérifié', tone: 'accent', icon: 'shield-check' },
  non_verifie: { label: 'Non vérifié', tone: 'neutral' },
};

/** The badge as a tag. Pass the result of `visibleBadge`. */
export function UserBadge({ badge }: { badge: DisplayBadge }) {
  const look = looks[badge];
  return <Tag label={look.label} tone={look.tone} icon={look.icon} />;
}
