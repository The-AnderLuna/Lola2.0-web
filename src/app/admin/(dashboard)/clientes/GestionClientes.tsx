'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Eye, RotateCcw, ShieldOff, Shield, Phone, Mail, CreditCard } from 'lucide-react';
import Modal from '@/components/admin/Modal';
import EmptyState from '@/components/admin/EmptyState';
import { useToast } from '@/components/admin/Toast';

interface Cliente {
  id: string; nombre: string | null; telefono: string; cedula: string | null;
  correo: string | null; fecha_cumpleanos: string | null; bloqueado: boolean;
  bot_pausado_hasta: string | null; created_at: string;
}

export default function GestionClientes() {
  const { showToast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [citasCliente, setCitasCliente] = useState<Array<{ id: string; estado: string; fecha_hora_inicio: string; precio_total: number; servicios: { nombre: string } | null }>>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set('q', busqueda);
      const res = await fetch(`/api/admin/clientes?${params}`);
      if (res.ok) { const json = await res.json(); setClientes(json.data); setTotal(json.total); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [busqueda]);

  useEffect(() => {
    const timer = setTimeout(() => fetchClientes(), 300);
    return () => clearTimeout(timer);
  }, [fetchClientes]);

  const openDetail = async (c: Cliente) => {
    setSelected(c);
    setLoadingCitas(true);
    try {
      const res = await fetch(`/api/admin/citas?q=${encodeURIComponent(c.telefono)}`);
      if (res.ok) { const json = await res.json(); setCitasCliente(json.data || []); }
    } catch (err) { console.error(err); }
    finally { setLoadingCitas(false); }
  };

  const handleAction = async (clienteId: string, updates: Record<string, unknown>, msg: string) => {
    try {
      const res = await fetch('/api/admin/clientes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clienteId, ...updates }),
      });
      if (res.ok) { showToast(msg, 'success'); fetchClientes(); setSelected(null); }
    } catch { showToast('Error', 'error'); }
  };

  const botStatus = (c: Cliente) => {
    if (c.bloqueado) return { label: 'Bloqueado', color: '#EF4444' };
    if (c.bot_pausado_hasta && new Date(c.bot_pausado_hasta) > new Date()) return { label: 'Pausado', color: '#F59E0B' };
    return { label: 'Activo', color: '#22C55E' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">Clientes — CRM</h1>
        <p className="text-sm text-text-secondary mt-1">{total} clientes registrados</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text" placeholder="Buscar por nombre, teléfono o cédula..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/30"
          style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(17, 17, 19, 0.6)', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
        {loading ? (
          <div className="p-8 text-center text-text-muted">Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <EmptyState icon={<Users className="w-8 h-8" />} title="Sin resultados" description="No se encontraron clientes" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase hidden md:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase hidden lg:table-cell">Cédula</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase hidden lg:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase">Bot</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gold uppercase hidden sm:table-cell">Registro</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => {
                  const bot = botStatus(c);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} onClick={() => openDetail(c)}>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{c.nombre || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden md:table-cell">{c.telefono}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden lg:table-cell">{c.cedula || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden lg:table-cell truncate max-w-[150px]">{c.correo || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: bot.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: bot.color }} />
                          {bot.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted hidden sm:table-cell">{new Date(c.created_at!).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); openDetail(c); }} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detalle del Cliente" size="lg">
        {selected && (
          <div className="space-y-5">
            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-text-muted" /><div><p className="text-xs text-text-muted">Nombre</p><p className="text-sm text-text-primary">{selected.nombre || '—'}</p></div></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-text-muted" /><div><p className="text-xs text-text-muted">Teléfono</p><p className="text-sm text-text-primary">{selected.telefono}</p></div></div>
              <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-text-muted" /><div><p className="text-xs text-text-muted">Cédula</p><p className="text-sm text-text-primary">{selected.cedula || '—'}</p></div></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-text-muted" /><div><p className="text-xs text-text-muted">Email</p><p className="text-sm text-text-primary">{selected.correo || '—'}</p></div></div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              {(selected.bot_pausado_hasta && new Date(selected.bot_pausado_hasta) > new Date()) && (
                <button onClick={() => handleAction(selected.id, { bot_pausado_hasta: null }, 'Bot reactivado')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reactivar Bot
                </button>
              )}
              <button onClick={() => handleAction(selected.id, { bloqueado: !selected.bloqueado }, selected.bloqueado ? 'Cliente desbloqueado' : 'Cliente bloqueado')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all" style={selected.bloqueado ? { background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)' } : { background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                {selected.bloqueado ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                {selected.bloqueado ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>

            {/* Historial de Citas */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <h3 className="text-sm font-medium text-text-primary mb-3">Historial de Citas</h3>
              {loadingCitas ? (
                <p className="text-xs text-text-muted">Cargando historial...</p>
              ) : citasCliente.length === 0 ? (
                <p className="text-xs text-text-muted">Sin citas registradas</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {citasCliente.slice(0, 10).map(cita => (
                    <div key={cita.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div>
                        <p className="text-xs text-text-primary">{cita.servicios?.nombre || 'Servicio'}</p>
                        <p className="text-[10px] text-text-muted">{new Date(cita.fecha_hora_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cita.precio_total)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${cita.estado === 'COMPLETADA' ? 'text-green-400 bg-green-400/10' : cita.estado === 'CANCELADA' ? 'text-red-400 bg-red-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                          {cita.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
