import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RepositorioCitas } from '@/adaptadores/repositorios/RepositorioCitas';
import { EstadoCita } from '@/nucleo/entidades/Tipos';

const repositorioCitas = new RepositorioCitas();

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener y validar la sesión
    const cookieStore = await cookies();
    const clienteIdSession = cookieStore.get('lola_client_session')?.value;

    if (!clienteIdSession) {
      return NextResponse.json({ error: 'No autorizado. Por favor inicia sesión nuevamente.' }, { status: 401 });
    }

    // 2. Obtener el citaId del cuerpo del request
    const { citaId } = await request.json();

    if (!citaId) {
      return NextResponse.json({ error: 'El identificador de la cita es requerido.' }, { status: 400 });
    }

    // 3. Buscar la cita
    const cita = await repositorioCitas.obtenerPorId(citaId);

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    // 4. Validar que la cita pertenezca al cliente logueado (como titular o directa)
    if (cita.clienteId !== clienteIdSession && cita.reservaTitularId !== clienteIdSession) {
      return NextResponse.json({ error: 'No tienes permisos para cancelar esta cita.' }, { status: 403 });
    }

    // 5. Validar que el estado sea estrictamente PRE_AGENDADA
    if (cita.estado !== EstadoCita.PRE_AGENDADA) {
      return NextResponse.json({
        error: 'Solo se pueden cancelar citas pre-agendadas autónomamente. Para citas confirmadas o en revisión, solicita la cancelación a través de WhatsApp.'
      }, { status: 400 });
    }

    // 6. Cancelar la cita (y todo su grupo si lo tiene)
    if (cita.grupoId) {
      // Usamos el cliente de supabase base para esta operacion especial
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
      const { error: cancelError } = await supabaseAdmin
        .from('citas')
        .update({ estado: EstadoCita.CANCELADA })
        .eq('grupo_id', cita.grupoId)
        .eq('estado', EstadoCita.PRE_AGENDADA);
        
      if (cancelError) {
        throw new Error(`Error cancelando el grupo de citas: ${cancelError.message}`);
      }
    } else {
      await repositorioCitas.actualizarEstado(citaId, EstadoCita.CANCELADA);
    }

    return NextResponse.json({ success: true, message: 'La reserva ha sido cancelada con éxito y el cupo ha sido liberado.' });

  } catch (error) {
    console.error('[Citas Cancelar API Error]', error);
    return NextResponse.json({ error: 'Error interno al cancelar la cita' }, { status: 500 });
  }
}
