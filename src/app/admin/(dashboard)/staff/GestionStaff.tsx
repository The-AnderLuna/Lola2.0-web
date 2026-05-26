'use client';

import { useState, useEffect } from 'react';
import { UserCog, Plus, Edit3, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import Modal from '@/components/admin/Modal';
import EmptyState from '@/components/admin/EmptyState';
import { useToast } from '@/components/admin/Toast';

interface Horario { dia_semana: number; hora_inicio: string; hora_fin: string; }
interface Profesional {
  id: string; nombre: string; rol: string; activo: boolean; calendario_id: string | null;
  horarios: Horario[];
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function GestionStaff() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profesional | null>(null);
  const [form, setForm] = useState({ nombre: '', rol: 'Staff', calendario_id: '' });
  const [horarios, setHorarios] = useState<Record<number, { activo: boolean; inicio: string; fin: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff');
      if (res.ok) { const json = await res.json(); setStaff(json.data); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const initHorarios = (existing: Horario[] = []) => {
    const h: Record<number, { activo: boolean; inicio: string; fin: string }> = {};
    for (let d = 0; d < 7; d++) {
      const found = existing.find(e => e.dia_semana === d);
      h[d] = found ? { activo: true, inicio: found.hora_inicio, fin: found.hora_fin } : { activo: false, inicio: '09:00', fin: '18:00' };
    }
    return h;
  };

  const openCreate = () => { setEditing(null); setForm({ nombre: '', rol: 'Staff', calendario_id: '' }); setHorarios(initHorarios()); setModalOpen(true); };
  const openEdit = (p: Profesional) => { setEditing(p); setForm({ nombre: p.nombre, rol: p.rol, calendario_id: p.calendario_id || '' }); setHorarios(initHorarios(p.horarios)); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const horariosArray = Object.entries(horarios).filter(([, v]) => v.activo).map(([k, v]) => ({ dia_semana: parseInt(k), hora_inicio: v.inicio, hora_fin: v.fin }));
      const method = editing ? 'PATCH' : 'POST';
      const body = editing ? { id: editing.id, ...form, horarios: horariosArray } : { ...form, horarios: horariosArray };
      const res = await fetch('/api/admin/staff', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { showToast(editing ? 'Profesional actualizado' : 'Profesional creado', 'success'); setModalOpen(false); fetchStaff(); }
      else showToast('Error al guardar', 'error');
    } catch { showToast('Error de conexión', 'error'); }
    finally { setSaving(false); }
  };

  const toggleActivo = async (p: Profesional) => {
    try {
      const res = await fetch('/api/admin/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, activo: !p.activo }) });
      if (res.ok) { showToast(p.activo ? 'Profesional desactivado' : 'Profesional activado', 'success'); fetchStaff(); }
    } catch { showToast('Error', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">Staff</h1>
          <p className="text-sm text-text-secondary mt-1">{staff.length} profesionales · {staff.filter(s => s.activo).length} activos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #D4AF37, #A8860A)', color: '#0A0A0B' }}>
          <Plus className="w-4 h-4" /> Agregar Profesional
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState icon={<UserCog className="w-8 h-8" />} title="Sin profesionales" description="Agrega tu primer profesional al equipo" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map(p => (
            <div key={p.id} className={`rounded-2xl p-5 transition-all hover:translate-y-[-2px] ${!p.activo ? 'opacity-50' : ''}`} style={{ background: 'rgba(17, 17, 19, 0.6)', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
              <div className="flex items-center gap-4 mb-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37' }}>
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">{p.nombre}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-md text-text-muted" style={{ background: 'rgba(255,255,255,0.05)' }}>{p.rol}</span>
                </div>
                <button onClick={() => toggleActivo(p)} className="text-text-muted hover:text-text-primary transition-colors">
                  {p.activo ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>

              {/* Schedule Preview */}
              <div className="flex gap-1 mb-3">
                {DIAS_SHORT.map((d, i) => {
                  const hasSchedule = p.horarios.some(h => h.dia_semana === i);
                  return (
                    <div key={i} className={`flex-1 text-center py-1 rounded text-[10px] font-medium ${hasSchedule ? 'text-gold' : 'text-text-muted'}`} style={hasSchedule ? { background: 'rgba(212, 175, 55, 0.1)' } : { background: 'rgba(255,255,255,0.03)' }}>
                      {d}
                    </div>
                  );
                })}
              </div>

              {p.calendario_id && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-3">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">{p.calendario_id.substring(0, 20)}...</span>
                </div>
              )}

              <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-gold transition-colors">
                <Edit3 className="w-3 h-3" /> Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Profesional' : 'Nuevo Profesional'} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Nombre</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/30" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Rol</label>
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/30" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <option value="Mile">Mile</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div className="col-span-full">
              <label className="block text-xs text-text-secondary mb-1.5">Google Calendar ID</label>
              <input value={form.calendario_id} onChange={e => setForm({ ...form, calendario_id: e.target.value })} placeholder="xxx@group.calendar.google.com" className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/30" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} />
            </div>
          </div>

          {/* Weekly Schedule */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /> Horario Semanal</h3>
            <div className="space-y-2">
              {DIAS.map((dia, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: horarios[i]?.activo ? 'rgba(212, 175, 55, 0.03)' : 'transparent' }}>
                  <label className="flex items-center gap-2 min-w-[100px] cursor-pointer">
                    <input type="checkbox" checked={horarios[i]?.activo || false} onChange={e => setHorarios({ ...horarios, [i]: { ...horarios[i], activo: e.target.checked } })} className="w-4 h-4 rounded accent-gold" />
                    <span className={`text-xs font-medium ${horarios[i]?.activo ? 'text-text-primary' : 'text-text-muted'}`}>{dia}</span>
                  </label>
                  {horarios[i]?.activo && (
                    <div className="flex items-center gap-2">
                      <input type="time" value={horarios[i]?.inicio || '09:00'} onChange={e => setHorarios({ ...horarios, [i]: { ...horarios[i], inicio: e.target.value } })} className="px-2 py-1 rounded-lg text-xs text-text-primary focus:outline-none" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} />
                      <span className="text-xs text-text-muted">a</span>
                      <input type="time" value={horarios[i]?.fin || '18:00'} onChange={e => setHorarios({ ...horarios, [i]: { ...horarios[i], fin: e.target.value } })} className="px-2 py-1 rounded-lg text-xs text-text-primary focus:outline-none" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-all" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre} className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #D4AF37, #A8860A)', color: '#0A0A0B' }}>
              {saving ? 'Guardando...' : (editing ? 'Guardar' : 'Crear')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
