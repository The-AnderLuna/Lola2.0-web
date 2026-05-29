import { supabase } from '@/lib/supabaseClient';

export class RepositorioConfiguracion {
  async obtenerConfiguracion(): Promise<any> {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Error obteniendo configuración: ${error.message}`);

    const { data: horariosData } = await supabase
      .from('horarios')
      .select('*');

    return {
      ...data,
      horarios: horariosData || []
    };
  }
}
