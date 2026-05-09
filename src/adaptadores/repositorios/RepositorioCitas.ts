import { supabase } from '@/lib/supabaseClient';
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
      row.created_at ? new Date(row.created_at) : new Date()
    ));
  }
}
