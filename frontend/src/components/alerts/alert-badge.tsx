import type { AlertType } from '@/types';
import { cn, ALERT_LABELS } from '@/lib/utils';

const TYPE_STYLES: Record<AlertType, string> = {
  EFECTIVO_ALTO: 'bg-orange-100 text-orange-800 ring-orange-600/20',
  EXTRANJERO_EFECTIVO_ALTO: 'bg-red-100 text-red-800 ring-red-600/20',
  RIESGO_ALTO: 'bg-red-100 text-red-800 ring-red-600/20',
  DATOS_INCOMPLETOS: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
  USO_TERCEROS: 'bg-purple-100 text-purple-800 ring-purple-600/20',
};

interface AlertBadgeProps {
  type: AlertType;
}

export function AlertBadge({ type }: AlertBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TYPE_STYLES[type],
      )}
    >
      {ALERT_LABELS[type] ?? type}
    </span>
  );
}
