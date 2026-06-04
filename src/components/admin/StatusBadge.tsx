import { EstadoCita, EstadoPago } from '@/nucleo/entidades/Tipos';

interface StatusBadgeProps {
  estado: string;
  tipo?: 'cita' | 'pago';
  size?: 'sm' | 'md';
}

const CITA_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  [EstadoCita.BLOQUEO_TEMPORAL]: { bg: 'rgba(161, 161, 170, 0.15)', text: '#A1A1AA', dot: '#A1A1AA' },
  [EstadoCita.PRE_AGENDADA]: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', dot: '#F59E0B' },
  [EstadoCita.EN_REVISION]: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', dot: '#3B82F6' },
  [EstadoCita.CONFIRMADA]: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', dot: '#22C55E' },
  [EstadoCita.REAGENDADA]: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', dot: '#A855F7' },
  [EstadoCita.CANCELADA]: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', dot: '#EF4444' },
  [EstadoCita.CANCELADA_POR_CLIENTE]: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', dot: '#EF4444' },
  [EstadoCita.CANCELADA_SISTEMA]: { bg: 'rgba(239, 68, 68, 0.10)', text: '#F87171', dot: '#F87171' },
  [EstadoCita.COMPLETADA]: { bg: 'rgba(34, 197, 94, 0.10)', text: '#86EFAC', dot: '#86EFAC' },
  [EstadoCita.NO_ASISTIO]: { bg: 'rgba(251, 146, 60, 0.15)', text: '#FB923C', dot: '#FB923C' },
};

const PAGO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  [EstadoPago.PENDIENTE]: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', dot: '#F59E0B' },
  [EstadoPago.REVISION]: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', dot: '#3B82F6' },
  [EstadoPago.APROBADO]: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', dot: '#22C55E' },
  [EstadoPago.RECHAZADO]: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', dot: '#EF4444' },
  [EstadoPago.REEMBOLSADO]: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', dot: '#A855F7' },
};

const ESTADO_LABELS: Record<string, string> = {
  [EstadoCita.BLOQUEO_TEMPORAL]: 'Bloqueada',
  [EstadoCita.PRE_AGENDADA]: 'Pre-agendada',
  [EstadoCita.EN_REVISION]: 'En Revisión',
  [EstadoCita.CONFIRMADA]: 'Confirmada',
  [EstadoCita.REAGENDADA]: 'Reagendada',
  [EstadoCita.CANCELADA]: 'Cancelada',
  [EstadoCita.CANCELADA_POR_CLIENTE]: 'Cancelada (Por Cliente)',
  [EstadoCita.CANCELADA_SISTEMA]: 'Cancelada (Sistema)',
  [EstadoCita.COMPLETADA]: 'Completada',
  [EstadoCita.NO_ASISTIO]: 'No Asistió',
  [EstadoPago.PENDIENTE]: 'Pendiente',
  [EstadoPago.REVISION]: 'En Revisión',
  [EstadoPago.APROBADO]: 'Aprobado',
  [EstadoPago.RECHAZADO]: 'Rechazado',
  [EstadoPago.REEMBOLSADO]: 'Reembolsado',
};

export default function StatusBadge({ estado, tipo = 'cita', size = 'sm' }: StatusBadgeProps) {
  const colors = tipo === 'pago' ? PAGO_COLORS : CITA_COLORS;
  const style = colors[estado] || { bg: 'rgba(161, 161, 170, 0.15)', text: '#A1A1AA', dot: '#A1A1AA' };
  const label = ESTADO_LABELS[estado] || estado;

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
      style={{ background: style.bg, color: style.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: style.dot }}
      />
      {label}
    </span>
  );
}
