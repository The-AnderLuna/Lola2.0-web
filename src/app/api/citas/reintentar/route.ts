import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { google } from 'googleapis';

const ESTADOS_ACTIVOS = [
  'BLOQUEO_TEMPORAL',
  'PRE_AGENDADA',
  'EN_REVISION',
  'CONFIRMADA',
  'REAGENDADA'
];

const ZONA_HORARIA = 'America/Bogota';
const ZONA_OFFSET_H = -5;

function utcToColombiaMinutes(isoStr: string): number {
  const d = new Date(isoStr);
  const utcTotalMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const colombiaMin = utcTotalMin + (ZONA_OFFSET_H * 60);
  return ((colombiaMin % 1440) + 1440) % 1440;
}

async function getGoogleBusyBlocks(
  calendarIds: string[],
  fecha: string
): Promise<{ inicio: number; fin: number; raw_start?: string; raw_end?: string }[]> {
  if (calendarIds.length === 0) return [];
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const timeMin = `${fecha}T05:00:00Z`;
    const timeMax = `${fecha}T04:59:59Z`.replace(fecha, (() => {
      const d = new Date(`${fecha}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    })());

    const { data } = await calendar.freebusy.query({
      requestBody: { timeMin, timeMax, timeZone: ZONA_HORARIA, items: calendarIds.map(id => ({ id })) },
    });

    const bloques: { inicio: number; fin: number; raw_start?: string; raw_end?: string }[] = [];
    for (const id of calendarIds) {
      const calData = data.calendars?.[id];
      if (calData?.errors) continue;
      const busy = calData?.busy ?? [];
      for (const slot of busy) {
        if (slot.start && slot.end) {
          bloques.push({
            inicio: utcToColombiaMinutes(slot.start),
            fin: utcToColombiaMinutes(slot.end),
            raw_start: slot.start,
            raw_end: slot.end
          });
        }
      }
    }
    return bloques;
  } catch (err) {
    console.error('[Google Calendar] Error:', err);
    return [];
  }
}

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

    // 4. Chequear colisión en la BD y Google Calendar
    for (const cita of citasAReactivar) {
       // Chequeo en Base de Datos
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

       // Chequeo en Google Calendar
       const { data: prof } = await supabase.from('profesionales').select('calendario_id').eq('id', cita.profesional_id).single();
       if (prof?.calendario_id) {
           const fechaCita = cita.fecha_hora_inicio.split('T')[0]; // asumiendo formato ISO YYYY-MM-DDTHH:mm...
           const gBlocks = await getGoogleBusyBlocks([prof.calendario_id], fechaCita);
           const citaInicioMin = utcToColombiaMinutes(cita.fecha_hora_inicio);
           const citaFinMin = utcToColombiaMinutes(cita.fecha_hora_fin);
           
           // Validar si algún bloque de Google intercepta
           const chocaGoogle = gBlocks.some(b => citaInicioMin < b.fin && citaFinMin > b.inicio);
           if (chocaGoogle) {
               return NextResponse.json({ error: 'SLOT_TOMADO', message: 'La profesional ya no tiene disponibilidad en su agenda a esa hora. Por favor realiza una nueva reserva.' }, { status: 409 });
           }
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
