import { supabase } from '@/lib/supabaseClient';
import { Servicio } from '@/nucleo/entidades/Servicio';

export class RepositorioServicios {
  async obtenerActivos(): Promise<Servicio[]> {
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('activo', true)
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw new Error(`Error obteniendo servicios: ${error.message}`);

    return (data || []).map(row => new Servicio(
      row.id,
      row.nombre,
      row.categoria,
      row.precio,
      row.duracion_min,
      row.abono_requerido || 0,
      row.buffer_min || 0,
      row.requiere_humano || false,
      row.es_tratamiento || false,
      row.activo ?? true,
      row.total_sesiones,
      row.responsable
    ));
  }
}
