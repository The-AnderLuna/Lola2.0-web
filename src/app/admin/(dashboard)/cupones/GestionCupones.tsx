'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Percent, DollarSign, Calendar, X, AlertCircle } from 'lucide-react';

export default function GestionCupones() {
  const [cupones, setCupones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCupon, setEditingCupon] = useState<any>(null);

  const defaultForm = {
    codigo: '',
    tipo: 'porcentaje',
    valor: '',
    descripcion: '',
    activo: true,
    max_usos: '',
    fecha_expiracion: ''
  };

  const [formData, setFormData] = useState(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCupones = async () => {
    try {
      const res = await fetch('/api/admin/cupones');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error fetching');
      setCupones(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCupones();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload: any = {
        ...formData,
        valor: parseInt(formData.valor as string, 10),
        max_usos: formData.max_usos ? parseInt(formData.max_usos as string, 10) : null,
        fecha_expiracion: formData.fecha_expiracion || null
      };

      if (editingCupon) payload.id = editingCupon.id;

      const res = await fetch('/api/admin/cupones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error saving');
      
      await fetchCupones();
      setShowModal(false);
      setEditingCupon(null);
      setFormData(defaultForm);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (cupon: any) => {
    setEditingCupon(cupon);
    setFormData({
      codigo: cupon.codigo,
      tipo: cupon.tipo,
      valor: cupon.valor.toString(),
      descripcion: cupon.descripcion || '',
      activo: cupon.activo,
      max_usos: cupon.max_usos ? cupon.max_usos.toString() : '',
      fecha_expiracion: cupon.fecha_expiracion || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cupón?')) return;
    try {
      await fetch(`/api/admin/cupones?id=${id}`, { method: 'DELETE' });
      await fetchCupones();
    } catch (err) {
      console.error(err);
      alert('Error eliminando cupón');
    }
  };

  const toggleStatus = async (cupon: any) => {
    try {
      const res = await fetch('/api/admin/cupones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cupon.id, codigo: cupon.codigo, activo: !cupon.activo })
      });
      if (res.ok) await fetchCupones();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestión de Cupones</h1>
          <p className="text-text-secondary mt-1">Crea y administra códigos de descuento</p>
        </div>
        <button
          onClick={() => {
            setEditingCupon(null);
            setFormData(defaultForm);
            setShowModal(true);
          }}
          className="bg-gold text-black px-4 py-2 rounded-xl font-medium hover:bg-gold-light transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Cupón</span>
        </button>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Cargando cupones...</div>
        ) : cupones.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No hay cupones creados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-surface border-b border-border-subtle text-text-muted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Valor</th>
                  <th className="px-6 py-4 font-semibold">Usos</th>
                  <th className="px-6 py-4 font-semibold">Expiración</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {cupones.map(cupon => (
                  <tr key={cupon.id} className="hover:bg-bg-surface/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-text-primary font-bold">{cupon.codigo}</span>
                        {cupon.descripcion && <span className="text-text-muted text-xs truncate max-w-[150px]">{cupon.descripcion}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-text-secondary text-sm capitalize">
                        {cupon.tipo === 'porcentaje' ? <Percent className="w-4 h-4 text-emerald-400" /> : <DollarSign className="w-4 h-4 text-emerald-400" />}
                        {cupon.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-primary text-sm font-semibold">
                      {cupon.tipo === 'porcentaje' ? `${cupon.valor}%` : `$${cupon.valor.toLocaleString('es-CO')}`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm">
                        <span className="text-text-primary">{cupon.usos_actuales} usados</span>
                        {cupon.max_usos && <span className="text-text-muted text-xs">de {cupon.max_usos} límite</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {cupon.fecha_expiracion ? (
                        <span className="flex items-center gap-1.5 text-text-secondary text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(cupon.fecha_expiracion).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-text-muted text-sm italic">Sin límite</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(cupon)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                          cupon.activo 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                        }`}
                      >
                        {cupon.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(cupon)} className="p-2 text-text-secondary hover:text-gold transition-colors rounded-lg hover:bg-gold/10">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cupon.id)} className="p-2 text-text-secondary hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-400/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Tag className="w-5 h-5 text-gold" />
                {editingCupon ? 'Editar Cupón' : 'Nuevo Cupón'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-400">{errorMsg}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej. CUMPLE10"
                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold transition-colors font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Tipo de Descuento</label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold transition-colors"
                  >
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="fijo">Valor Fijo ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Valor</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">
                      {formData.tipo === 'porcentaje' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.valor}
                      onChange={e => setFormData({ ...formData, valor: e.target.value })}
                      placeholder={formData.tipo === 'porcentaje' ? '10' : '50000'}
                      className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-primary focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Descripción (Interna)</label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Notas sobre para qué es este cupón"
                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Límite de Usos (Opcional)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_usos}
                    onChange={e => setFormData({ ...formData, max_usos: e.target.value })}
                    placeholder="Sin límite"
                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Expira en (Opcional)</label>
                  <input
                    type="date"
                    value={formData.fecha_expiracion}
                    onChange={e => setFormData({ ...formData, fecha_expiracion: e.target.value })}
                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gold text-black px-6 py-2.5 rounded-xl font-medium hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
