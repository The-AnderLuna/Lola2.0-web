import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ZONA_HORARIA = 'America/Bogota';
const ZONA_OFFSET_H = -5; // Colombia = UTC-5
const BLOQUEO_DURACION_MS = 10 * 60 * 1000; // 10 minutos

const ESTADOS_BLOQUEANTES = [
  'BLOQUEO_TEMPORAL',
  'PRE_AGENDADA',
  'EN_REVISION',
  'CONFIRMADA',
  'REAGENDADA',
];

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
    const body = await request.json();
    const { fecha, hora, servicios, personas: personasReq } = body;

    // Soporte para array de personas (Reserva compartida) o array simple (retrocompatibilidad)
    let personas: any[][] = [];
    if (personasReq) {
      personas = personasReq;
    } else if (servicios) {
      personas = [servicios];
    } else {
      personas = [[{
        profesionalId: body.profesionalId || 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2',
        duracionMin: body.duracionMin || 60,
        servicioId: body.servicioId,
        precioTotal: body.precioTotal
      }]];
    }

    if (!fecha || !hora || personas.length === 0 || personas[0].length === 0) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    await supabase.rpc('cleanup_expired_locks');

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [h, m] = hora.split(':').map(Number);
    const diaSemana = new Date(anio, mes - 1, dia).getDay();
    const baseStartMin = h * 60 + m; // Hora base en minutos

    const profIds = [...new Set(personas.flat().map(s => s.profesionalId))];
    const profData: Record<string, { horarios: { inicio: number, fin: number }[], bloques: { inicio: number, fin: number }[] }> = {};

    for (const pid of profIds) {
      const { data: horarios } = await supabase.from('horarios').select('hora_inicio, hora_fin').eq('dia_semana', diaSemana).eq('profesional_id', pid);
      const parsedHorarios = (horarios || []).map(hr => {
        const [hI, mI] = hr.hora_inicio.split(':').map(Number);
        const [hF, mF] = hr.hora_fin.split(':').map(Number);
        return { inicio: hI * 60 + mI, fin: hF * 60 + mF };
      });

      const dayStartUTC = `${fecha}T05:00:00Z`;
      const nextDay = new Date(anio, mes - 1, dia + 1);
      const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
      const dayEndUTC = `${nextDayStr}T04:59:59Z`;

      const { data: citas } = await supabase.from('citas')
        .select('fecha_hora_inicio, fecha_hora_fin')
        .in('estado', ESTADOS_BLOQUEANTES)
        .lt('fecha_hora_inicio', dayEndUTC)
        .gt('fecha_hora_fin', dayStartUTC)
        .eq('profesional_id', pid);

      const bloquesSupabase = (citas || []).map(c => ({
        inicio: utcToColombiaMinutes(c.fecha_hora_inicio),
        fin: utcToColombiaMinutes(c.fecha_hora_fin)
      }));

      const { data: prof } = await supabase.from('profesionales').select('calendario_id').eq('id', pid).single();
      let bloquesGoogle: { inicio: number, fin: number }[] = [];
      if (prof?.calendario_id) {
        const gBlocks = await getGoogleBusyBlocks([prof.calendario_id], fecha);
        bloquesGoogle = gBlocks.map(b => ({ inicio: b.inicio, fin: b.fin }));
      }

      profData[pid] = { horarios: parsedHorarios, bloques: [...bloquesSupabase, ...bloquesGoogle] };
    }

    const grupoId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + BLOQUEO_DURACION_MS);
    const citasAInsertar = [];
    
    const bloquesVirtuales: { [pid: string]: { inicio: number, fin: number }[] } = {};
    for (const pid of profIds) bloquesVirtuales[pid] = [];

    // Recrear el algoritmo Tetris para insertar los bloques exactos
    for (let pIndex = 0; pIndex < personas.length; pIndex++) {
      const personaServicios = personas[pIndex];
      let tiempoActualMin = baseStartMin;

      for (let i = 0; i < personaServicios.length; i++) {
        const srv = personaServicios[i];
        const pData = profData[srv.profesionalId];
        
        let slotInicio = tiempoActualMin;
        let encontroHueco = false;
        
        // El primer servicio de la PRIMERA persona DEBE empezar exactamente en la hora solicitada.
        // Para personas adicionales (amiga), su primer servicio puede deslizarse hacia adelante
        // si el profesional está ocupado por la titular.
        const limiteBusqueda = (i === 0 && pIndex === 0) ? baseStartMin : baseStartMin + 240;
        
        while (slotInicio <= limiteBusqueda) {
          const slotFin = slotInicio + srv.duracionMin;
          
          const enHorario = pData.horarios.some(h => slotInicio >= h.inicio && slotFin <= h.fin);
          if (!enHorario) { slotInicio += 5; continue; }

          const ocupadoReal = pData.bloques.some(b => slotInicio < b.fin && slotFin > b.inicio);
          if (ocupadoReal) { slotInicio += 5; continue; }

          const ocupadoVirtual = bloquesVirtuales[srv.profesionalId].some(b => slotInicio < b.fin && slotFin > b.inicio);
          if (ocupadoVirtual) { slotInicio += 5; continue; }

          encontroHueco = true;
          bloquesVirtuales[srv.profesionalId].push({ inicio: slotInicio, fin: slotFin });
          tiempoActualMin = slotFin;
          
          // Convertir minutos a ISO
          const stH = Math.floor(slotInicio / 60);
          const stM = slotInicio % 60;
          const endH = Math.floor(slotFin / 60);
          const endM = slotFin % 60;

          const isoStart = new Date(`${fecha}T${String(stH).padStart(2, '0')}:${String(stM).padStart(2, '0')}:00.000-05:00`);
          const isoEnd = new Date(`${fecha}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00.000-05:00`);

          citasAInsertar.push({
            _uid: srv.uid,
            id: crypto.randomUUID(),
            grupo_id: grupoId,
            profesional_id: srv.profesionalId,
            servicio_id: srv.servicioId || null,
            fecha_hora_inicio: isoStart.toISOString(),
            fecha_hora_fin: isoEnd.toISOString(),
            duracion_min: srv.duracionMin,
            precio_total: srv.precioTotal || 0,
            estado: 'BLOQUEO_TEMPORAL',
            expires_at: expiresAt.toISOString(),
          });
          break;
        }

        if (!encontroHueco) {
          return NextResponse.json(
            { error: 'SLOT_TOMADO', message: 'Alguien más tomó este horario mientras elegías. Por favor selecciona otra hora.' },
            { status: 409 }
          );
        }
      }
    }

    const citasDb = citasAInsertar.map(({ _uid, ...rest }) => rest);
    const { error: errorInsert } = await supabase.from('citas').insert(citasDb);
    if (errorInsert) throw errorInsert;

    // --- VERIFICACIÓN DE BLOQUEO OPTIMISTA (PREVENCIÓN DE RACE CONDITIONS) ---
    // Pequeña pausa para permitir que inserciones concurrentes en el mismo ms terminen
    await new Promise(resolve => setTimeout(resolve, 50));

    const { data: myInserted } = await supabase.from('citas').select('id, created_at').eq('grupo_id', grupoId);
    
    let collisionDetected = false;
    if (myInserted && myInserted.length > 0) {
      for (const miCita of citasAInsertar) {
        const { data: overlapping } = await supabase.from('citas')
          .select('id, created_at')
          .eq('profesional_id', miCita.profesional_id)
          .in('estado', ESTADOS_BLOQUEANTES)
          .lt('fecha_hora_inicio', miCita.fecha_hora_fin)
          .gt('fecha_hora_fin', miCita.fecha_hora_inicio)
          .neq('grupo_id', grupoId);

        if (overlapping && overlapping.length > 0) {
          for (const other of overlapping) {
             const myBlock = myInserted.find(m => m.id === miCita.id);
             const myTime = myBlock?.created_at ? new Date(myBlock.created_at).getTime() : Date.now();
             const otherTime = other.created_at ? new Date(other.created_at).getTime() : Date.now();

             if (otherTime < myTime) {
                collisionDetected = true; break;
             } else if (otherTime === myTime) {
                // Desempate alfabético por ID si fueron creados en el mismo milisegundo exacto
                if (other.id < miCita.id) {
                   collisionDetected = true; break;
                }
             }
          }
        }
        if (collisionDetected) break;
      }
    }

    if (collisionDetected) {
      await supabase.from('citas').delete().eq('grupo_id', grupoId);
      return NextResponse.json(
        { error: 'SLOT_TOMADO', message: 'Alguien más tomó este horario al mismo tiempo. Por favor selecciona otra hora.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      bloqueoId: grupoId,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 600,
      citas: citasAInsertar.map(c => ({
        uid: c._uid,
        id: c.id,
        inicio: c.fecha_hora_inicio,
        fin: c.fecha_hora_fin
      }))
    });

  } catch (error: any) {
    console.error('[bloqueo-temporal POST]', error);
    if (error?.code === '23P01') {
      return NextResponse.json(
        { error: 'SLOT_TOMADO', message: 'Alguien más acaba de tomar esta hora.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bloqueoId = searchParams.get('id');

    if (!bloqueoId) {
      return NextResponse.json({ error: 'ID de bloqueo requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('citas')
      .update({ estado: 'CANCELADA_SISTEMA' })
      .eq('grupo_id', bloqueoId)
      .eq('estado', 'BLOQUEO_TEMPORAL');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[bloqueo-temporal DELETE]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
