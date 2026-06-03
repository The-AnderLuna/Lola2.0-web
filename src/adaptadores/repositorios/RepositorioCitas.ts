import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { Cita } from '@/nucleo/entidades/Cita';
import { EstadoCita } from '@/nucleo/entidades/Tipos';

export class RepositorioCitas {
  async crear(cita: Cita): Promise<void> {
    const { error } = await supabase.from('citas').insert({
      id: cita.id,
      cliente_id: cita.clienteId,
      servicio_id: cita.servicioId,
      profesional_id: cita.profesionalId,
      fecha_hora_inicio: cita.fechaHoraInicio.toISOString(),
      fecha_hora_fin: cita.fechaHoraFin.toISOString(),
      duracion_min: cita.duracionMin,
      precio_total: cita.precioTotal,
      estado: cita.estado,
      expires_at: cita.expiresAt ? cita.expiresAt.toISOString() : null,
      grupo_id: cita.grupoId,
    });

    if (error) throw new Error(`Error creando cita: ${error.message}`);
  }

  async obtenerActivasPorRango(fechaInicio: Date, fechaFin: Date): Promise<Cita[]> {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .gte('fecha_hora_inicio', fechaInicio.toISOString())
      .lte('fecha_hora_inicio', fechaFin.toISOString())
      .in('estado', [EstadoCita.PRE_AGENDADA, EstadoCita.CONFIRMADA, EstadoCita.EN_REVISION, EstadoCita.REAGENDADA]);

    if (error) throw new Error(`Error obteniendo citas: ${error.message}`);

    return (data || []).map(row => new Cita(
      row.id,
      row.cliente_id || '',
      row.servicio_id || '',
      row.profesional_id || '',
      new Date(row.fecha_hora_inicio),
      new Date(row.fecha_hora_fin),
      row.duracion_min,
      row.precio_total,
      row.estado as EstadoCita,
      row.expires_at ? new Date(row.expires_at) : null,
      row.grupo_id,
      row.reserva_titular_id || null,
      row.notas || null,
      row.created_at ? new Date(row.created_at) : new Date(),
      row.metodo_pago || null
    ));
  }

  async obtenerPorClienteId(clienteId: string): Promise<Cita[]> {
    const { data: initialData, error: initialError } = await supabase
      .from('citas')
      .select('*')
      .or(`cliente_id.eq.${clienteId},reserva_titular_id.eq.${clienteId}`);

    if (initialError) throw new Error(`Error obteniendo citas por cliente: ${initialError.message}`);
    
    if (!initialData || initialData.length === 0) return [];

    // Find all unique grupo_ids
    const grupoIds = [...new Set(initialData.map(cita => cita.grupo_id).filter(Boolean))];
    
    let allData = [...initialData];

    if (grupoIds.length > 0) {
      // Fetch all citas for these groups
      const { data: groupData, error: groupError } = await supabase
        .from('citas')
        .select('*')
        .in('grupo_id', grupoIds);

      if (groupError) throw new Error(`Error obteniendo citas de grupo: ${groupError.message}`);
      
      // Merge and remove duplicates
      if (groupData) {
        const uniqueIds = new Set(allData.map(c => c.id));
        for (const cita of groupData) {
          if (!uniqueIds.has(cita.id)) {
            uniqueIds.add(cita.id);
            allData.push(cita);
          }
        }
      }
    }

    // Sort by fecha_hora_inicio descending
    allData.sort((a, b) => new Date(b.fecha_hora_inicio).getTime() - new Date(a.fecha_hora_inicio).getTime());

    return allData.map(row => new Cita(
      row.id,
      row.cliente_id || '',
      row.servicio_id || '',
      row.profesional_id || '',
      new Date(row.fecha_hora_inicio),
      new Date(row.fecha_hora_fin),
      row.duracion_min,
      row.precio_total,
      row.estado as EstadoCita,
      row.expires_at ? new Date(row.expires_at) : null,
      row.grupo_id,
      row.reserva_titular_id || null,
      row.notas || null,
      row.created_at ? new Date(row.created_at) : new Date(),
      row.metodo_pago || null
    ));
  }

  async actualizarEstado(citaId: string, estado: EstadoCita): Promise<void> {
    const { error } = await supabase
      .from('citas')
      .update({ estado })
      .eq('id', citaId);

    if (error) throw new Error(`Error actualizando estado de cita: ${error.message}`);
  }

  async obtenerPorId(citaId: string): Promise<Cita | null> {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .eq('id', citaId)
      .maybeSingle();

    if (error) throw new Error(`Error obteniendo cita por ID: ${error.message}`);
    if (!data) return null;

    return new Cita(
      data.id,
      data.cliente_id || '',
      data.servicio_id || '',
      data.profesional_id || '',
      new Date(data.fecha_hora_inicio),
      new Date(data.fecha_hora_fin),
      data.duracion_min,
      data.precio_total,
      data.estado as EstadoCita,
      data.expires_at ? new Date(data.expires_at) : null,
      data.grupo_id,
      data.reserva_titular_id || null,
      data.notas || null,
      data.created_at ? new Date(data.created_at) : new Date(),
      data.metodo_pago || null
    );
  }
}


