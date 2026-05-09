import { supabase } from '@/lib/supabaseClient';
import { Profesional } from '@/nucleo/entidades/Profesional';

export class RepositorioProfesionales {
  async obtenerActivos(): Promise<Profesional[]> {
    const { data, error } = await supabase
      .from('profesionales')
      .select('*')
      .eq('activo', true);

    if (error) throw new Error(`Error obteniendo profesionales: ${error.message}`);

    return (data || []).map(row => new Profesional(
      row.id,
      row.nombre,
      row.rol,
      row.activo ?? true,
      row.calendario_id
    ));
  }
}
