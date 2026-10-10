import { Pedido } from './models';

export const IGV = 0.18;

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'teal';

const TONES: Record<Tone, readonly [bg: string, fg: string]> = {
  success: ['var(--success-bg)', 'var(--success)'],
  warning: ['var(--warning-bg)', 'var(--warning)'],
  danger: ['var(--danger-bg)', 'var(--danger)'],
  info: ['var(--info-bg)', 'var(--info)'],
  neutral: ['var(--ink-100)', 'var(--ink-700)'],
  brand: ['var(--brand-50)', 'var(--brand-600)'],
  teal: ['var(--teal-50)', 'var(--teal-700)'],
};

const TONE_OF: Record<string, Tone> = {
  Activo: 'success',
  Inactivo: 'neutral',
  Pendiente: 'warning',
  'En proceso': 'info',
  Enviado: 'brand',
  Entregado: 'success',
  Cancelado: 'danger',
  Administrador: 'brand',
  Vendedor: 'teal',
  Almacén: 'info',
  Auditor: 'neutral',
  Creó: 'success',
  Editó: 'info',
  Eliminó: 'danger',
  'Inició sesión': 'brand',
  'Cerró sesión': 'neutral',
  'Cambió estado': 'warning',
};

export function tone(value: string): readonly [bg: string, fg: string] {
  return TONES[TONE_OF[value] ?? 'neutral'];
}

export function money(n: number): string {
  return '$ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const pad = (n: number) => String(n).padStart(2, '0');

export function today(): string {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function nowStamp(): string {
  const d = new Date();
  return `${today()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function orderSubtotal(o: Pedido): number {
  return o.items.reduce((s, i) => s + i.qty * i.precio, 0);
}

export function orderTotal(o: Pedido): number {
  return orderSubtotal(o) * (1 + IGV);
}
