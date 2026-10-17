import type { IconComponent, IconComponentProps } from '@/lib/icon-context';
import { Icon } from './Icon';

function gameIcon(name: 'share' | 'arrow'): IconComponent {
  return function GameIcon({ size = 16, className }: IconComponentProps) {
    return <Icon name={name} className={className} size={size} />;
  };
}

export const ShareGameIcon = gameIcon('share');
export const ArrowGameIcon = gameIcon('arrow');
