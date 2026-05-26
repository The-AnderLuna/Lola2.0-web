'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Search, Filter, ChevronDown,
  CheckCircle, XCircle, Clock, Eye, UserCheck, UserX,
} from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import Modal from '@/components/admin/Modal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import { useToast } from '@/components/admin/Toast';
import { EstadoCita } from '@/nucleo/entidades/Tipos';

interface Cita {
  id: string;
  estado: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  duracion_min: number;
  precio_total: number;
  expires_at: string | null;
  grupo_id: string | null;
  clientes: { id: string; nombre: string; telefono: string; cedula: string } | null;
  servicios: { nombre: string; categoria: string; precio: number } | null;
  profesionales: { nombre: string; rol: string } | null;
}

const ESTADOS_FILTER = [
  { value: '', label: 'Todas' },
  { value: EstadoCita.PRE_AGENDADA, label: 'Pre-agendada' },
  { value: EstadoCita.EN_REVISION, label: 'En Revisión' },
  { value: EstadoCita.CONFIRMADA, label: 'Confirmada' },
  { value: EstadoCita.COMPLETADA, label: 'Completada' },
  { value: EstadoCita.CANCELADA, label: 'Cancelada' },
  { value: EstadoCita.NO_ASISTIO, label: 'No Asistió' },
];

export default function GestionCitas() {
  const { showToast } = useToast();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [detailCita, setDetailCita] = useState<Cita | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ cita: Cita; estado: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCitas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroFecha) params.set('fecha', filtroFecha);
      if (busqueda) params.set('q', busqueda);

      const res = await fetch(`/api/admin/citas?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCitas(json.data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroFecha, busqueda]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCitas(), 300);
    return () => clearTimeout(timer);
  }, [fetchCitas]);

  const handleCambiarEstado = async () => {
    if (!confirmAction) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/citas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmAction.cita.id, estado: confirmAction.estado }),
      });

      if (res.ok) {
        showToast(`Cita actualizada a ${confirmAction.estado}`, 'success');
        setConfirmAction(null);
        setDetailCita(null);
        fetchCitas();
      } else {
        showToast('Error al actualizar la cita', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
          Gestión de Citas
        </h1>
        <p className="text-sm text-text-secondary mt-1">Administra todas las citas del sistema</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-text-primary placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
            style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Estado Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl text-sm text-text-primary appearance-none cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
            style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {ESTADOS_FILTER.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>

        {/* Date Filter */}
        <input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm text-text-primary
            focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
          style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(17, 17, 19, 0.6)', border: '1px solid rgba(212, 175, 55, 0.1)' }}
      >
        {loading ? (
          <div className="p-8 text-center text-text-muted">Cargando citas...</div>
        ) : citas.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="w-8 h-8" />}
            title="Sin citas"
            description="No se encontraron citas con los filtros seleccionados"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase tracking-wider hidden md:table-cell">Servicio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase tracking-wider hidden lg:table-cell">Profesional</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase tracking-wider">Fecha / Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gold uppercase tracking-wider hidden sm:table-cell">Precio</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((cita) => (
                  <tr
                    key={cita.id}
                    className="transition-colors hover:bg-white/[0.02] cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onClick={() => setDetailCita(cita)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">{cita.clientes?.nombre || '—'}</p>
                      <p className="text-xs text-text-muted">{cita.clientes?.telefono || ''}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-text-primary truncate max-w-[180px]">{cita.servicios?.nombre || '—'}</p>
                      <p className="text-xs text-text-muted">{cita.servicios?.categoria || ''}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-text-secondary">{cita.profesionales?.nombre || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-text-primary">{formatDate(cita.fecha_hora_inicio)}</p>
                      <p className="text-xs text-text-muted">{formatTime(cita.fecha_hora_inicio)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge estado={cita.estado} />
                      {cita.estado === EstadoCita.PRE_AGENDADA && cita.expires_at && (
                        <CountdownBadge expiresAt={cita.expires_at} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-sm text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(cita.precio_total)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDetailCita(cita)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {['PRE_AGENDADA', 'EN_REVISION'].includes(cita.estado) && (
                          <button
                            onClick={() => setConfirmAction({ cita, estado: 'CONFIRMADA' })}
                            className="p-1.5 rounded-lg text-text-muted hover:text-green-400 hover:bg-green-400/10 transition-all"
                            title="Confirmar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {['PRE_AGENDADA', 'EN_REVISION', 'CONFIRMADA'].includes(cita.estado) && (
                          <button
                            onClick={() => setConfirmAction({ cita, estado: 'CANCELADA' })}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!detailCita} onClose={() => setDetailCita(null)} title="Detalle de Cita" size="md">
        {detailCita && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge estado={detailCita.estado} size="md" />
              <span className="text-lg font-bold text-gold">{formatCurrency(detailCita.precio_total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Cliente" value={detailCita.clientes?.nombre || '—'} />
              <InfoField label="Teléfono" value={detailCita.clientes?.telefono || '—'} />
              <InfoField label="Servicio" value={detailCita.servicios?.nombre || '—'} />
              <InfoField label="Categoría" value={detailCita.servicios?.categoria || '—'} />
              <InfoField label="Profesional" value={detailCita.profesionales?.nombre || '—'} />
              <InfoField label="Duración" value={`${detailCita.duracion_min} min`} />
              <InfoField label="Fecha" value={formatDate(detailCita.fecha_hora_inicio)} />
              <InfoField label="Hora" value={`${formatTime(detailCita.fecha_hora_inicio)} - ${formatTime(detailCita.fecha_hora_fin)}`} />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {['PRE_AGENDADA', 'EN_REVISION'].includes(detailCita.estado) && (
                <ActionBtn
                  icon={<CheckCircle className="w-4 h-4" />}
                  label="Confirmar"
                  color="#22C55E"
                  onClick={() => setConfirmAction({ cita: detailCita, estado: 'CONFIRMADA' })}
                />
              )}
              {detailCita.estado === 'CONFIRMADA' && (
                <>
                  <ActionBtn
                    icon={<UserCheck className="w-4 h-4" />}
                    label="Completada"
                    color="#22C55E"
                    onClick={() => setConfirmAction({ cita: detailCita, estado: 'COMPLETADA' })}
                  />
                  <ActionBtn
                    icon={<UserX className="w-4 h-4" />}
                    label="No Asistió"
                    color="#FB923C"
                    onClick={() => setConfirmAction({ cita: detailCita, estado: 'NO_ASISTIO' })}
                  />
                </>
              )}
              {['PRE_AGENDADA', 'EN_REVISION', 'CONFIRMADA'].includes(detailCita.estado) && (
                <ActionBtn
                  icon={<XCircle className="w-4 h-4" />}
                  label="Cancelar"
                  color="#EF4444"
                  onClick={() => setConfirmAction({ cita: detailCita, estado: 'CANCELADA' })}
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleCambiarEstado}
        title={`¿Cambiar estado a ${confirmAction?.estado}?`}
        message={`La cita de ${confirmAction?.cita.clientes?.nombre || 'este cliente'} será marcada como "${confirmAction?.estado}".`}
        confirmLabel="Sí, cambiar"
        variant={confirmAction?.estado === 'CANCELADA' ? 'danger' : 'warning'}
        loading={actionLoading}
      />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-0.5">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      {icon} {label}
    </button>
  );
}

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expirada'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="text-[10px] text-amber-400 ml-1 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
      ⏳{timeLeft}
    </span>
  );
}
