import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a number as COP currency. */
export function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/** Format an ISO date string in locale-friendly format. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/** Map an AlertType code to a human-readable label. */
export const ALERT_LABELS: Record<string, string> = {
  EFECTIVO_ALTO: 'Efectivo alto',
  EXTRANJERO_EFECTIVO_ALTO: 'Extranjero + efectivo alto',
  RIESGO_ALTO: 'Riesgo alto',
  DATOS_INCOMPLETOS: 'Datos incompletos',
  USO_TERCEROS: 'Uso de terceros',
};
