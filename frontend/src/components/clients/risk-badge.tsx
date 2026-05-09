import type { RiskLevel } from '@/types';
import { cn } from '@/lib/utils';

const STYLES: Record<RiskLevel, string> = {
  BAJO: 'bg-green-100 text-green-800 ring-green-600/20',
  MEDIO: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
  ALTO: 'bg-red-100 text-red-800 ring-red-600/20',
};

const LABELS: Record<RiskLevel, string> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
};

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
}

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium ring-1 ring-inset',
        STYLES[level],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      )}
    >
      {LABELS[level]}
    </span>
  );
}
