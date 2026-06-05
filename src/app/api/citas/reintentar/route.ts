import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const ESTADOS_ACTIVOS = [
  'BLOQUEO_TEMPORAL',
  'PRE_AGENDADA',
  'EN_REVISION',
  'CONFIRMADA',
  'REAGENDADA'
];

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener y validar la sesión
    const cookieStore = await cookies();
    const clienteIdSession = cookieStore.get('lola_client_session')?.value;

    if (!clienteIdSession) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // 2. Obtener datos
    const { citaId, grupoId } = await request.json();

    if (!citaId && !grupoId) {
      return NextResponse.json({ error: 'Faltan identificadores de cita.' }, { status: 400 });
    }

    // 3. Buscar la(s) cita(s) a reactivar
    let query = supabase.from('citas').select('*');
    if (grupoId) {
      query = query.eq('grupo_id', grupoId);
    } else {
      query = query.eq('id', citaId);
    }

    const { data: citasAReactivar, error: errorFetch } = await query;

    if (errorFetch || !citasAReactivar || citasAReactivar.length === 0) {
      return NextResponse.json({ error: 'No se encontró la reserva.' }, { status: 404 });
    }

    // Validar que pertenezcan al cliente o que el titular sea el cliente
    const perteneceAlCliente = citasAReactivar.some(c => c.cliente_id === clienteIdSession || c.reserva_titular_id === clienteIdSession);
    if (!perteneceAlCliente) {
       return NextResponse.json({ error: 'No tienes permiso para reactivar esta reserva.' }, { status: 403 });
    }

    // Validar que estén en estado CANCELADA_FALTA_PAGO
    const validStates = citasAReactivar.every(c => c.estado === 'CANCELADA_FALTA_PAGO');
    if (!validStates) {
       return NextResponse.json({ error: 'Solo se pueden retomar reservas canceladas por falta de pago.' }, { status: 400 });
    }

    // Extraer ids que vamos a ignorar en el chequeo de colisión
    const idsAIgnorar = citasAReactivar.map(c => c.id);

    // 4. Chequear colisión en la BD para el o los profesionales involucrados
    for (const cita of citasAReactivar) {
       const { data: colisiones, error: errorColision } = await supabase
         .from('citas')
         .select('id')
         .eq('profesional_id', cita.profesional_id)
         .in('estado', ESTADOS_ACTIVOS)
         .not('id', 'in', `(${idsAIgnorar.join(',')})`)
         .lt('fecha_hora_inicio', cita.fecha_hora_fin)
         .gt('fecha_hora_fin', cita.fecha_hora_inicio);

       if (errorColision) {
         console.error("Error comprobando colisiones:", errorColision);
         return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
       }

       if (colisiones && colisiones.length > 0) {
         return NextResponse.json({ error: 'SLOT_TOMADO', message: 'El horario original ya ha sido ocupado por alguien más. Por favor realiza una nueva reserva.' }, { status: 409 });
       }
    }

    // 5. Todo libre, reactivar. Damos 30 minutos desde AHORA.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: errorUpdate } = await supabase
      .from('citas')
      .update({
         estado: 'PRE_AGENDADA',
         expires_at: expiresAt
      })
      .in('id', idsAIgnorar);

    if (errorUpdate) {
       console.error("Error reactivando citas:", errorUpdate);
       return NextResponse.json({ error: 'Error interno del servidor al actualizar estado.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Reserva reactivada correctamente.', expiresAt });

  } catch (error) {
    console.error('Error in reintentar cita:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
