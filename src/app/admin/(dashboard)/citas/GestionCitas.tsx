'use client';

import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import {
  CalendarDays, Search, ChevronRight,
  CheckCircle, XCircle, Eye, UserCheck, UserX, Users, Package,
} from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import Modal from '@/components/admin/Modal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import { useToast } from '@/components/admin/Toast';
import { EstadoCita } from '@/nucleo/entidades/Tipos';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubCita {
  id: string;
  estado: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  duracion_min: number;
  precio_total: number;
  clientes: { id: string; nombre: string; telefono: string; cedula: string } | null;
  clientes_titular: { id: string; nombre: string; telefono: string } | null;
  servicios: { nombre: string; categoria: string; precio: number } | null;
  profesionales: { nombre: string; rol: string } | null;
}

interface Cita {
  id: string;
  estado: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  duracion_min: number;
  precio_total: number;
  expires_at: string | null;
  grupo_id: string | null;
  es_grupo: boolean;
  tipo_grupo: 'AMIGAS' | 'PAQUETE' | null;
  cantidad_citas: number;
  sub_citas: SubCita[];
  clientes: { id: string; nombre: string; telefono: string; cedula: string } | null;
  clientes_titular: { id: string; nombre: string; telefono: string } | null;
  servicios: { nombre: string; categoria: string; precio: number } | null;
  profesionales: { nombre: string; rol: string } | null;
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const TABS = [
  { value: '', label: 'Todas' },
  { value: EstadoCita.PRE_AGENDADA, label: 'Pre-agendada', dot: '#a78bfa' },
  { value: EstadoCita.EN_REVISION, label: 'En Revisión', dot: '#fbbf24' },
  { value: EstadoCita.CONFIRMADA, label: 'Confirmada', dot: '#D4AF37' },
  { value: EstadoCita.COMPLETADA, label: 'Completada', dot: '#22c55e' },
  { value: EstadoCita.REAGENDADA, label: 'Reagendada', dot: '#60a5fa' },
  { value: EstadoCita.CANCELADA_POR_CLIENTE, label: 'Cancelada x Cliente', dot: '#ef4444' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function GestionCitas() {
  const { showToast } = useToast();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState(EstadoCita.PRE_AGENDADA);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [detailCita, setDetailCita] = useState<Cita | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ cita: Cita; estado: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newCitaFlash, setNewCitaFlash] = useState<string | null>(null);
  // Track known grupo_ids / cita ids to detect new arrivals
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── Fetch citas via admin API ─────────────────────────────────────────────

  const fetchCitas = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }, [filtroEstado, filtroFecha, busqueda]);

  // ─── Initial load + re-fetch when filters change ─────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => fetchCitas(), 300);
    return () => clearTimeout(timer);
  }, [fetchCitas]);

  // ─── Silent polling every 10 s for new citas ───────────────────────────────
  // We poll the secure admin API (cookie-authenticated), so the citas table
  // stays completely locked in Supabase — no public Realtime exposure.
  useEffect(() => {
    const poll = async () => {
      try {
        // Always fetch without active filters so we catch ALL new citas
        const res = await fetch('/api/admin/citas?limit=100');
        if (!res.ok) return;
        const json = await res.json();
        const freshCitas: Cita[] = json.data || [];

        if (isFirstLoad.current) {
          // Populate seen IDs on the very first poll — don't flash anything
          freshCitas.forEach(c => seenIdsRef.current.add(c.id));
          isFirstLoad.current = false;
          return;
        }

        // Detect truly new rows (IDs we haven't seen yet)
        const newEntries = freshCitas.filter(c => !seenIdsRef.current.has(c.id));
        if (newEntries.length > 0) {
          newEntries.forEach(c => seenIdsRef.current.add(c.id));
          // Flash the first new cita
          setNewCitaFlash(newEntries[0].id);
          setTimeout(() => setNewCitaFlash(null), 3500);
          showToast(
            newEntries.length === 1
              ? `Nueva cita recibida · ${newEntries[0].clientes?.nombre || 'Cliente'} ✦`
              : `${newEntries.length} nuevas citas recibidas ✦`,
            'success'
          );
          // Silently refresh the table with current filters
          fetchCitas(true);
        }
      } catch {
        // Network error — skip silently, retry next cycle
      }
    };

    const interval = setInterval(poll, 10_000); // 10 seconds
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount/unmount only

  // ─── Change cita status ────────────────────────────────────────────────────

  const handleCambiarEstado = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const body: any = { id: confirmAction.cita.id, estado: confirmAction.estado };
      if (confirmAction.cita.es_grupo && confirmAction.cita.grupo_id) {
        body.grupo_id = confirmAction.cita.grupo_id;
      }

      const res = await fetch('/api/admin/citas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(`Cita(s) actualizadas a ${confirmAction.estado}`, 'success');
        setConfirmAction(null);
        setDetailCita(null);
        // Realtime will trigger re-fetch automatically
      } else {
        showToast('Error al actualizar la cita', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full blur-[120px] opacity-[0.02] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div>
          <h1 className="font-display text-3xl font-light text-text-primary tracking-wide uppercase">
            Gestión de Citas
          </h1>
          <p className="text-xs text-text-secondary mt-1 tracking-wider uppercase opacity-80">
            Administración centralizada de reservas
          </p>
        </div>
      </div>

      {/* ── Status Tab Filters ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((tab) => {
          const active = filtroEstado === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setFiltroEstado(tab.value)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200
                ${active
                  ? 'text-black shadow-lg'
                  : 'text-text-muted hover:text-text-primary border border-white/[0.06] hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              style={active ? {
                background: tab.dot ? `${tab.dot}` : 'linear-gradient(135deg, #D4AF37, #c9a227)',
                boxShadow: tab.dot ? `0 4px 20px ${tab.dot}55` : '0 4px 20px rgba(212,175,55,0.4)',
              } : {}}
            >
              {tab.dot && !active && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tab.dot }} />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Search + Date ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm text-text-primary placeholder:text-text-muted/60
              bg-black/40 border border-white/[0.05] focus:border-gold/30 focus:outline-none transition-all"
          />
        </div>
        <input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm text-text-primary bg-black/40 border border-white/[0.05]
            focus:outline-none focus:border-gold/30 transition-all cursor-pointer"
        />
        {filtroFecha && (
          <button
            onClick={() => setFiltroFecha('')}
            className="text-xs text-text-muted hover:text-text-primary px-3 py-2.5 rounded-xl border border-white/[0.05] hover:border-white/15 transition-all"
          >
            ✕ Limpiar fecha
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden backdrop-blur-md"
        style={{
          background: 'linear-gradient(145deg, rgba(20,20,25,0.4) 0%, rgba(10,10,12,0.7) 100%)',
          border: '1px solid rgba(255,255,255,0.03)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.7)',
        }}>
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <span className="text-xs uppercase tracking-[0.15em] text-text-muted/80">Cargando reservas...</span>
          </div>
        ) : citas.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="w-10 h-10 text-gold/60" />}
            title="Sin citas registradas"
            description="No encontramos citas para los filtros aplicados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.03]" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gold uppercase tracking-[0.15em] opacity-80">Cliente / Grupo</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gold uppercase tracking-[0.15em] opacity-80 hidden md:table-cell">Servicio</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gold uppercase tracking-[0.15em] opacity-80 hidden lg:table-cell">Especialista</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gold uppercase tracking-[0.15em] opacity-80">Fecha / Hora</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gold uppercase tracking-[0.15em] opacity-80">Estado</th>
                  <th className="text-right px-5 py-4 text-xs font-semibold text-gold uppercase tracking-[0.15em] opacity-80 hidden sm:table-cell">Total</th>
                  <th className="text-center px-5 py-4 text-xs font-semibold text-gold uppercase tracking-[0.15em] opacity-80">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((cita) => {
                  const isExpanded = expandedGroups.has(cita.id);
                  const clienteNombre = cita.clientes?.nombre || '—';
                  const isNew = newCitaFlash && (
                    cita.id === newCitaFlash ||
                    cita.sub_citas?.some(s => s.id === newCitaFlash)
                  );

                  return (
                    <Fragment key={cita.id}>
                      {/* ── Main Row ─────────────────────────────────────── */}
                      <tr
                        className={`transition-all duration-500 border-b border-white/[0.02] group cursor-pointer
                          ${cita.es_grupo ? 'hover:bg-gold/[0.02]' : 'hover:bg-white/[0.02]'}
                          ${isNew ? 'animate-pulse-once bg-green-500/[0.04]' : ''}`}
                        style={isNew ? { boxShadow: 'inset 0 0 0 1px rgba(34,197,94,0.2)' } : {}}
                        onClick={() => cita.es_grupo ? toggleGroup(cita.id) : setDetailCita(cita)}
                      >
                        {/* Cliente / Grupo */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {cita.es_grupo ? (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border
                                ${cita.tipo_grupo === 'AMIGAS'
                                  ? 'bg-purple-500/10 border-purple-400/20 text-purple-400'
                                  : 'bg-gold/10 border-gold/20 text-gold'}`}>
                                {cita.tipo_grupo === 'AMIGAS' ? <Users className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-gold border border-gold/15 bg-gradient-to-br from-gold/10 to-gold/5 shrink-0">
                                {getInitials(clienteNombre)}
                              </div>
                            )}
                            <div className="min-w-0">
                              {cita.es_grupo ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-sm font-medium truncate ${cita.tipo_grupo === 'AMIGAS' ? 'text-purple-300' : 'text-gold'}`}>
                                      {cita.tipo_grupo === 'AMIGAS' ? 'Reserva de Amigas' : 'Paquete de Servicios'}
                                    </p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0
                                      ${cita.tipo_grupo === 'AMIGAS' ? 'bg-purple-500/15 text-purple-400' : 'bg-gold/15 text-gold'}`}>
                                      ×{cita.cantidad_citas}
                                    </span>
                                  </div>
                                  <p className="text-xs text-text-muted truncate">{clienteNombre}</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-text-primary group-hover:text-gold transition-colors duration-200 truncate">
                                    {clienteNombre}
                                  </p>
                                  <p className="text-xs text-text-muted">{cita.clientes?.telefono || ''}</p>
                                </>
                              )}
                            </div>
                            {cita.es_grupo && (
                              <ChevronRight className={`w-4 h-4 text-text-muted ml-auto shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            )}
                          </div>
                        </td>

                        {/* Servicio */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          {cita.es_grupo ? (
                            <span className="text-xs text-text-muted italic">{cita.cantidad_citas} servicios — ver detalle</span>
                          ) : (
                            <>
                              <p className="text-sm text-text-primary truncate max-w-[200px]">{cita.servicios?.nombre || '—'}</p>
                              <p className="text-xs text-text-muted">{cita.servicios?.categoria || ''}</p>
                            </>
                          )}
                        </td>

                        {/* Especialista */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-sm text-text-secondary">{cita.profesionales?.nombre || '—'}</span>
                        </td>

                        {/* Fecha / Hora */}
                        <td className="px-5 py-4">
                          <p className="text-sm text-text-primary font-medium">{formatDate(cita.fecha_hora_inicio)}</p>
                          <p className="text-xs text-text-muted">{formatTime(cita.fecha_hora_inicio)}</p>
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge estado={cita.estado} />
                            {cita.estado === EstadoCita.PRE_AGENDADA && cita.expires_at && (
                              <CountdownBadge expiresAt={cita.expires_at} />
                            )}
                          </div>
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 text-right hidden sm:table-cell">
                          <span className="text-sm font-medium text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(cita.precio_total)}
                          </span>
                          {cita.es_grupo && (
                            <p className="text-[10px] text-text-muted">total grupo</p>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setDetailCita(cita)}
                              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {['PRE_AGENDADA', 'EN_REVISION'].includes(cita.estado) && (
                              <button
                                onClick={() => setConfirmAction({ cita, estado: 'CONFIRMADA' })}
                                className="p-2 rounded-xl text-text-muted hover:text-green-400 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 transition-all"
                                title="Confirmar"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {['PRE_AGENDADA', 'EN_REVISION', 'CONFIRMADA'].includes(cita.estado) && (
                              <button
                                onClick={() => setConfirmAction({ cita, estado: 'CANCELADA' })}
                                className="p-2 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                title="Cancelar"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded Sub-rows ─────────────────────────────── */}
                      {cita.es_grupo && isExpanded && cita.sub_citas.map((sub) => (
                        <tr key={sub.id} className="border-b border-white/[0.01] bg-white/[0.01]">
                          <td className="px-5 py-3 pl-14">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-text-secondary border border-white/10 bg-white/5 shrink-0">
                                {getInitials(sub.clientes?.nombre || '?')}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-text-secondary">{sub.clientes?.nombre || '—'}</p>
                                {sub.clientes_titular && (
                                  <p className="text-[10px] text-text-muted">Titular: {sub.clientes_titular.nombre}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <p className="text-xs text-text-secondary truncate max-w-[200px]">{sub.servicios?.nombre || '—'}</p>
                            <p className="text-[10px] text-text-muted">{sub.duracion_min} min</p>
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell">
                            <span className="text-xs text-text-muted">{sub.profesionales?.nombre || '—'}</span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-xs text-text-secondary">{formatTime(sub.fecha_hora_inicio)}</p>
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge estado={sub.estado} />
                          </td>
                          <td className="px-5 py-3 text-right hidden sm:table-cell">
                            <span className="text-xs text-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(sub.precio_total)}
                            </span>
                          </td>
                          <td className="px-5 py-3" />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      <Modal isOpen={!!detailCita} onClose={() => setDetailCita(null)} title="Detalle de la Reserva" size="lg">
        {detailCita && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.05) 0%, transparent 100%)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}>
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold/80 block mb-1">Estado</span>
                <StatusBadge estado={detailCita.estado} size="md" />
                {detailCita.es_grupo && (
                  <span className={`mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full
                    ${detailCita.tipo_grupo === 'AMIGAS' ? 'bg-purple-500/15 text-purple-400' : 'bg-gold/15 text-gold'}`}>
                    {detailCita.tipo_grupo === 'AMIGAS' ? <Users className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                    {detailCita.tipo_grupo === 'AMIGAS' ? 'Reserva de Amigas' : 'Paquete'} · {detailCita.cantidad_citas} citas
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted block mb-1">Total</span>
                <span className="text-2xl font-light text-gold">{formatCurrency(detailCita.precio_total)}</span>
              </div>
            </div>

            {!detailCita.es_grupo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 bg-[#0a0a0c]/60 p-5 rounded-2xl border border-white/[0.03]">
                <InfoField label="CLIENTE" value={detailCita.clientes?.nombre || '—'} />
                <InfoField label="IDENTIFICACIÓN" value={detailCita.clientes?.cedula || '—'} />
                <InfoField label="TELÉFONO" value={detailCita.clientes?.telefono || '—'} />
                <InfoField label="CATEGORÍA" value={detailCita.servicios?.categoria || '—'} />
                <InfoField label="SERVICIO" value={detailCita.servicios?.nombre || '—'} />
                <InfoField label="ESPECIALISTA" value={detailCita.profesionales?.nombre || '—'} />
                <InfoField label="DURACIÓN" value={`${detailCita.duracion_min} min`} />
                <InfoField label="FECHA Y HORA" value={`${formatDate(detailCita.fecha_hora_inicio)} · ${formatTime(detailCita.fecha_hora_inicio)}`} />
              </div>
            )}

            {detailCita.es_grupo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-gold/75 tracking-wider uppercase">Servicios del Grupo</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                {detailCita.sub_citas.map((sub) => (
                  <div key={sub.id} className="bg-[#0a0a0c]/60 p-4 rounded-xl border border-white/[0.03] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-gold border border-gold/15 bg-gold/5 shrink-0">
                          {getInitials(sub.clientes?.nombre || '?')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{sub.clientes?.nombre || '—'}</p>
                          {sub.clientes_titular && (
                            <p className="text-[10px] text-text-muted">Titular: {sub.clientes_titular.nombre}</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge estado={sub.estado} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <InfoField label="SERVICIO" value={sub.servicios?.nombre || '—'} />
                      <InfoField label="CATEGORÍA" value={sub.servicios?.categoria || '—'} />
                      <InfoField label="ESPECIALISTA" value={sub.profesionales?.nombre || '—'} />
                      <InfoField label="HORA" value={formatTime(sub.fecha_hora_inicio)} />
                      <InfoField label="DURACIÓN" value={`${sub.duracion_min} min`} />
                      <InfoField label="PRECIO" value={formatCurrency(sub.precio_total)} />
                    </div>
                  </div>
                ))}
                <div className="p-3 rounded-xl flex items-center justify-between text-sm"
                  style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)' }}>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Total ({detailCita.cantidad_citas} servicios)</span>
                  <span className="text-gold font-medium">{formatCurrency(detailCita.precio_total)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/[0.03]">
              {['PRE_AGENDADA', 'EN_REVISION'].includes(detailCita.estado) && (
                <ActionBtn icon={<CheckCircle className="w-4 h-4" />} label="Confirmar Reserva" color="#22C55E"
                  onClick={() => setConfirmAction({ cita: detailCita, estado: 'CONFIRMADA' })} />
              )}
              {detailCita.estado === 'CONFIRMADA' && (
                <>
                  <ActionBtn icon={<UserCheck className="w-4 h-4" />} label="Completar Servicio" color="#10B981"
                    onClick={() => setConfirmAction({ cita: detailCita, estado: 'COMPLETADA' })} />
                  <ActionBtn icon={<UserX className="w-4 h-4" />} label="No Asistió" color="#FB923C"
                    onClick={() => setConfirmAction({ cita: detailCita, estado: 'NO_ASISTIO' })} />
                </>
              )}
              {['PRE_AGENDADA', 'EN_REVISION', 'CONFIRMADA'].includes(detailCita.estado) && (
                <ActionBtn icon={<XCircle className="w-4 h-4" />} label="Cancelar Reserva" color="#EF4444"
                  onClick={() => setConfirmAction({ cita: detailCita, estado: 'CANCELADA' })} />
              )}
              {detailCita.es_grupo && (
                <p className="w-full text-[10px] text-text-muted mt-1">
                  ⚠️ Los cambios de estado aplicarán a <strong>todas las citas del grupo</strong>.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Confirm Dialog ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleCambiarEstado}
        title={`¿Cambiar estado a ${confirmAction?.estado}?`}
        message={
          confirmAction?.cita.es_grupo
            ? `Se actualizarán las ${confirmAction?.cita.cantidad_citas} citas del grupo a "${confirmAction?.estado}".`
            : `La cita de ${confirmAction?.cita.clientes?.nombre || 'este cliente'} será marcada como "${confirmAction?.estado}".`
        }
        confirmLabel="Sí, cambiar"
        variant={confirmAction?.estado === 'CANCELADA' ? 'danger' : 'warning'}
        loading={actionLoading}
      />
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-gold/75 tracking-wider uppercase">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] border"
      style={{ background: `${color}0c`, color, borderColor: `${color}25` }}
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
    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10"
      style={{ fontVariantNumeric: 'tabular-nums', width: 'fit-content' }}>
      ⏳ {timeLeft}
    </span>
  );
}
