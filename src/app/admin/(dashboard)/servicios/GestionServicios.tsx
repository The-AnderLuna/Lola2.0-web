'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Plus, Edit3, ToggleLeft, ToggleRight, Clock, DollarSign, Tag } from 'lucide-react';
import Modal from '@/components/admin/Modal';
import EmptyState from '@/components/admin/EmptyState';
import { useToast } from '@/components/admin/Toast';

interface Servicio {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  duracion_min: number;
  abono_requerido: number;
  buffer_min: number;
  responsable: string | null;
  es_tratamiento: boolean;
  requiere_humano: boolean;
  activo: boolean;
  total_sesiones: number | null;
  guion_venta: string | null;
}

const CATEGORIAS = ['Cejas', 'Pestañas', 'Faciales', 'Micropigmentación', 'Depilación', 'Corporal', 'Labios', 'Promos'];

const EMPTY_FORM: Partial<Servicio> = {
  nombre: '', categoria: 'Cejas', precio: 0, duracion_min: 30, abono_requerido: 0,
  buffer_min: 0, responsable: 'COMPARTIDO', es_tratamiento: false, requiere_humano: false,
  total_sesiones: null, guion_venta: '',
};

export default function GestionServicios() {
  const { showToast } = useToast();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Servicio | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchServicios(); }, []);

  const fetchServicios = async () => {
    try {
      const res = await fetch('/api/admin/servicios');
      if (res.ok) { const json = await res.json(); setServicios(json.data); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditingService(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (s: Servicio) => { setEditingService(s); setForm(s); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingService ? 'PATCH' : 'POST';
      const body = editingService ? { id: editingService.id, ...form } : form;
      const res = await fetch('/api/admin/servicios', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editingService ? 'Servicio actualizado' : 'Servicio creado', 'success');
        setModalOpen(false);
        fetchServicios();
      } else { showToast('Error al guardar', 'error'); }
    } catch { showToast('Error de conexión', 'error'); }
    finally { setSaving(false); }
  };

  const toggleActivo = async (s: Servicio) => {
    try {
      const res = await fetch('/api/admin/servicios', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, activo: !s.activo }),
      });
      if (res.ok) {
        showToast(s.activo ? 'Servicio desactivado' : 'Servicio activado', 'success');
        fetchServicios();
      }
    } catch { showToast('Error', 'error'); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  const categorias = [...new Set(servicios.map(s => s.categoria))].sort();
  const filtered = filtroCategoria ? servicios.filter(s => s.categoria === filtroCategoria) : servicios;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">Servicios</h1>
          <p className="text-sm text-text-secondary mt-1">{servicios.length} servicios · {servicios.filter(s => s.activo).length} activos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #D4AF37, #A8860A)', color: '#0A0A0B' }}>
          <Plus className="w-4 h-4" /> Nuevo Servicio
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        <button onClick={() => setFiltroCategoria('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${!filtroCategoria ? 'text-gold' : 'text-text-muted hover:text-text-secondary'}`} style={!filtroCategoria ? { background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' } : { background: 'rgba(34, 34, 40, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
          Todas ({servicios.length})
        </button>
        {categorias.map(cat => (
          <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filtroCategoria === cat ? 'text-gold' : 'text-text-muted hover:text-text-secondary'}`} style={filtroCategoria === cat ? { background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' } : { background: 'rgba(34, 34, 40, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {cat} ({servicios.filter(s => s.categoria === cat).length})
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Sparkles className="w-8 h-8" />} title="Sin servicios" description="No hay servicios en esta categoría" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className={`rounded-2xl p-4 transition-all hover:translate-y-[-2px] group ${!s.activo ? 'opacity-50' : ''}`} style={{ background: 'rgba(17, 17, 19, 0.6)', border: '1px solid rgba(212, 175, 55, 0.08)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate">{s.nombre}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-md text-text-muted" style={{ background: 'rgba(255,255,255,0.05)' }}>{s.categoria}</span>
                    {s.responsable && <span className="text-xs text-text-muted">{s.responsable}</span>}
                  </div>
                </div>
                <button onClick={() => toggleActivo(s)} className="text-text-muted hover:text-text-primary transition-colors" title={s.activo ? 'Desactivar' : 'Activar'}>
                  {s.activo ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{fmt(s.precio)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duracion_min} min</span>
                {s.abono_requerido > 0 && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Abono: {fmt(s.abono_requerido)}</span>}
              </div>

              <button onClick={() => openEdit(s)} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-gold transition-colors">
                <Edit3 className="w-3 h-3" /> Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nombre" value={form.nombre || ''} onChange={v => setForm({ ...form, nombre: v })} />
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/30" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <FormField label="Precio (COP)" value={form.precio?.toString() || '0'} onChange={v => setForm({ ...form, precio: parseInt(v) || 0 })} type="number" />
            <FormField label="Duración (min)" value={form.duracion_min?.toString() || '30'} onChange={v => setForm({ ...form, duracion_min: parseInt(v) || 30 })} type="number" />
            <FormField label="Abono Requerido" value={form.abono_requerido?.toString() || '0'} onChange={v => setForm({ ...form, abono_requerido: parseInt(v) || 0 })} type="number" />
            <FormField label="Buffer (min)" value={form.buffer_min?.toString() || '0'} onChange={v => setForm({ ...form, buffer_min: parseInt(v) || 0 })} type="number" />
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Responsable</label>
              <select value={form.responsable || 'COMPARTIDO'} onChange={e => setForm({ ...form, responsable: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/30" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <option value="MILE">Mile</option>
                <option value="STAFF">Staff</option>
                <option value="COMPARTIDO">Compartido</option>
              </select>
            </div>
            <div className="flex items-center gap-4 col-span-full">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" checked={form.es_tratamiento || false} onChange={e => setForm({ ...form, es_tratamiento: e.target.checked })} className="w-4 h-4 rounded accent-gold" />
                Es tratamiento
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" checked={form.requiere_humano || false} onChange={e => setForm({ ...form, requiere_humano: e.target.checked })} className="w-4 h-4 rounded accent-gold" />
                Requiere humano
              </label>
            </div>
            {form.es_tratamiento && (
              <FormField label="Total Sesiones" value={form.total_sesiones?.toString() || ''} onChange={v => setForm({ ...form, total_sesiones: parseInt(v) || null })} type="number" />
            )}
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Guión de Venta</label>
            <textarea value={form.guion_venta || ''} onChange={e => setForm({ ...form, guion_venta: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} placeholder="Descripción o script de venta para Lola..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-all" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre} className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #D4AF37, #A8860A)', color: '#0A0A0B' }}>
              {saving ? 'Guardando...' : (editingService ? 'Guardar Cambios' : 'Crear Servicio')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/30" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} />
    </div>
  );
}
