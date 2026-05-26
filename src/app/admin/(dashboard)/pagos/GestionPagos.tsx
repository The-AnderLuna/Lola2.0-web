'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import KpiCard from '@/components/admin/KpiCard';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import { useToast } from '@/components/admin/Toast';

interface Pago {
  id: string;
  monto: number;
  metodo: string;
  estado: string;
  comprobante_url: string | null;
  created_at: string;
  citas: {
    fecha_hora_inicio: string;
    precio_total: number;
    clientes: { nombre: string; telefono: string } | null;
    servicios: { nombre: string } | null;
  } | null;
}

interface Metricas {
  ingresoHoy: number;
  ingresoSemana: number;
  ingresoMes: number;
  pendientes: number;
}

export default function GestionPagos() {
  const { showToast } = useToast();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [metricas, setMetricas] = useState<Metricas>({ ingresoHoy: 0, ingresoSemana: 0, ingresoMes: 0, pendientes: 0 });
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ pago: Pago; estado: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchPagos(); }, [filtroEstado]);

  const fetchPagos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      const res = await fetch(`/api/admin/pagos?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPagos(json.data || []);
        setMetricas(json.metricas);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/pagos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmAction.pago.id, estado: confirmAction.estado }),
      });
      if (res.ok) {
        showToast(confirmAction.estado === 'APROBADO' ? 'Pago aprobado y cita confirmada ✓' : 'Pago rechazado', confirmAction.estado === 'APROBADO' ? 'success' : 'warning');
        setConfirmAction(null);
        fetchPagos();
      }
    } catch { showToast('Error', 'error'); }
    finally { setActionLoading(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">Pagos & Finanzas</h1>
        <p className="text-sm text-text-secondary mt-1">Gestiona los pagos y comprobantes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="w-5 h-5" />} title="Ingresos Hoy" value={fmt(metricas.ingresoHoy)} animate={false} />
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} title="Ingresos Semana" value={fmt(metricas.ingresoSemana)} animate={false} accentColor="#3B82F6" />
        <KpiCard icon={<CreditCard className="w-5 h-5" />} title="Ingresos Mes" value={fmt(metricas.ingresoMes)} animate={false} accentColor="#22C55E" />
        <KpiCard icon={<Clock className="w-5 h-5" />} title="Pendientes" value={metricas.pendientes} accentColor="#F59E0B" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PENDIENTE', 'REVISION', 'APROBADO', 'RECHAZADO'].map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroEstado === e ? 'text-gold' : 'text-text-muted hover:text-text-secondary'}`}
            style={filtroEstado === e ? { background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' } : { background: 'rgba(34, 34, 40, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {e || 'Todos'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(17, 17, 19, 0.6)', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
        {loading ? (
          <div className="p-8 text-center text-text-muted">Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <EmptyState icon={<CreditCard className="w-8 h-8" />} title="Sin pagos" description="No hay pagos con los filtros seleccionados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase hidden md:table-cell">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase hidden lg:table-cell">Servicio</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gold uppercase">Monto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase">Método</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(pago => (
                  <tr key={pago.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 text-sm text-text-primary">{new Date(pago.created_at!).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-text-primary">{pago.citas?.clientes?.nombre || '—'}</p>
                      <p className="text-xs text-text-muted">{pago.citas?.clientes?.telefono || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary hidden lg:table-cell">{pago.citas?.servicios?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(pago.monto)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg text-text-secondary" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {pago.metodo}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge estado={pago.estado} tipo="pago" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {['PENDIENTE', 'REVISION'].includes(pago.estado) && (
                          <>
                            <button onClick={() => setConfirmAction({ pago, estado: 'APROBADO' })} className="p-1.5 rounded-lg text-text-muted hover:text-green-400 hover:bg-green-400/10 transition-all" title="Aprobar">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmAction({ pago, estado: 'RECHAZADO' })} className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all" title="Rechazar">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
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

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={confirmAction?.estado === 'APROBADO' ? '¿Aprobar pago?' : '¿Rechazar pago?'}
        message={confirmAction?.estado === 'APROBADO' ? 'El pago será aprobado y la cita se confirmará automáticamente.' : 'El pago será rechazado.'}
        confirmLabel={confirmAction?.estado === 'APROBADO' ? 'Aprobar' : 'Rechazar'}
        variant={confirmAction?.estado === 'RECHAZADO' ? 'danger' : 'warning'}
        loading={actionLoading}
      />
    </div>
  );
}
