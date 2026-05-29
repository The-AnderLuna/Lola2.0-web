import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CONFIGURACIÓN ---
const ZONA_HORARIA = 'America/Bogota';
const ZONA_OFFSET_H = -5; // Colombia = UTC-5

// Estados que bloquean un espacio en Supabase
const ESTADOS_BLOQUEANTES = [
  'BLOQUEO_TEMPORAL',
  'PRE_AGENDADA',
  'EN_REVISION',
  'CONFIRMADA',
  'REAGENDADA',
];

function minutosAHora24(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Convierte un ISO timestamp UTC a minutos desde medianoche en hora Colombia
function utcToColombiaMinutes(isoStr: string): number {
  const d = new Date(isoStr);
  const utcTotalMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const colombiaMin = utcTotalMin + (ZONA_OFFSET_H * 60);
  return ((colombiaMin % 1440) + 1440) % 1440;
}

// --- GOOGLE CALENDAR: obtener bloques ocupados ---
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
      requestBody: {
        timeMin,
        timeMax,
        timeZone: ZONA_HORARIA,
        items: calendarIds.map(id => ({ id })),
      },
    });

    const bloques: { inicio: number; fin: number; raw_start?: string; raw_end?: string }[] = [];

    for (const id of calendarIds) {
      const calData = data.calendars?.[id];
      if (calData?.errors) continue;
      const busy = calData?.busy ?? [];

      for (const slot of busy) {
        if (slot.start && slot.end) {
          const inicio = utcToColombiaMinutes(slot.start);
          const fin = utcToColombiaMinutes(slot.end);
          bloques.push({ inicio, fin, raw_start: slot.start, raw_end: slot.end });
        }
      }
    }

    return bloques;
  } catch (err) {
    console.error('[Google Calendar] Error:', err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const excludeBloqueoId = searchParams.get('exclude_bloqueo_id');

    const personasParam = searchParams.get('personas');
    let personas: { profesionalId: string, duracionMin: number }[][] = [];

    if (personasParam) {
      personas = JSON.parse(personasParam);
    } else {
      const serviciosParam = searchParams.get('servicios');
      if (serviciosParam) {
        personas = [JSON.parse(serviciosParam)];
      } else {
        personas = [[{
          profesionalId: searchParams.get('profesional_id') || 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2',
          duracionMin: parseInt(searchParams.get('duracion') || '60')
        }]];
      }
    }

    if (!fecha || personas.length === 0 || personas[0].length === 0) {
      return NextResponse.json({ error: 'Parámetro fecha y personas requeridos' }, { status: 400 });
    }

    // Limpiar bloqueos expirados
    await supabase.rpc('cleanup_expired_locks');

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);
    const diaSemana = fechaObj.getDay();

    const profIds = [...new Set(personas.flat().map(s => s.profesionalId))];

    // Verificar si algún profesional requerido tiene este día bloqueado (Días Libres)
    const { data: diasBloqueados } = await supabase
      .from('dias_bloqueados')
      .select('profesional_id')
      .eq('fecha', fecha)
      .in('profesional_id', profIds);

    if (diasBloqueados && diasBloqueados.length > 0) {
      console.log(`[disponibilidad] Fecha ${fecha} bloqueada para los profesionales:`, diasBloqueados.map(d => d.profesional_id));
      return NextResponse.json({ slots: [], fecha, disponible: false });
    }

    const profData: Record<string, { horarios: { inicio: number, fin: number }[], bloques: { inicio: number, fin: number }[] }> = {};

    for (const pid of profIds) {
      // A. Horarios laborales
      const { data: horarios } = await supabase
        .from('horarios')
        .select('hora_inicio, hora_fin')
        .eq('dia_semana', diaSemana)
        .eq('profesional_id', pid);

      const parsedHorarios = (horarios || []).map(h => {
        const [hI, mI] = h.hora_inicio.split(':').map(Number);
        const [hF, mF] = h.hora_fin.split(':').map(Number);
        return { inicio: hI * 60 + mI, fin: hF * 60 + mF };
      });

      // B. Citas en Supabase
      const dayStartUTC = `${fecha}T05:00:00Z`;
      const nextDay = new Date(anio, mes - 1, dia + 1);
      const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
      const dayEndUTC = `${nextDayStr}T04:59:59Z`;

      let query = supabase
        .from('citas')
        .select('fecha_hora_inicio, fecha_hora_fin')
        .in('estado', ESTADOS_BLOQUEANTES)
        .lt('fecha_hora_inicio', dayEndUTC)
        .gt('fecha_hora_fin', dayStartUTC)
        .eq('profesional_id', pid);

      if (excludeBloqueoId) {
        query = query.neq('grupo_id', excludeBloqueoId);
      }

      const { data: citas } = await query;

      const bloquesSupabase = (citas || []).map(c => ({
        inicio: utcToColombiaMinutes(c.fecha_hora_inicio),
        fin: utcToColombiaMinutes(c.fecha_hora_fin)
      }));

      // C. Bloques en Google Calendar
      const { data: prof } = await supabase.from('profesionales').select('calendario_id').eq('id', pid).single();
      let bloquesGoogle: { inicio: number, fin: number }[] = [];
      if (prof?.calendario_id) {
        const gBlocks = await getGoogleBusyBlocks([prof.calendario_id], fecha);
        bloquesGoogle = gBlocks.map(b => ({ inicio: b.inicio, fin: b.fin }));
      }

      profData[pid] = {
        horarios: parsedHorarios,
        bloques: [...bloquesSupabase, ...bloquesGoogle]
      };
      console.log(`[disponibilidad] Prof ${pid}: ${parsedHorarios.length} bloques horario, ${bloquesSupabase.length} citas, ${bloquesGoogle.length} gcal`);
    }

    // --- CÁLCULO DEL SPAN TEÓRICO MÍNIMO ---
    let minSpanTeorico = 0;
    {
      let minInicioT = Infinity;
      let maxFinT = -Infinity;
      const bloquesVirtualesT: { [pid: string]: { inicio: number, fin: number }[] } = {};
      for (const pid of profIds) bloquesVirtualesT[pid] = [];

      for (const personaServicios of personas) {
        let tiempoActualT = 0;
        for (const srv of personaServicios) {
          let slotInicioT = tiempoActualT;
          while (true) {
            const slotFinT = slotInicioT + srv.duracionMin;
            const ocupadoVirtual = bloquesVirtualesT[srv.profesionalId].some(b => slotInicioT < b.fin && slotFinT > b.inicio);
            if (!ocupadoVirtual) {
              bloquesVirtualesT[srv.profesionalId].push({ inicio: slotInicioT, fin: slotFinT });
              tiempoActualT = slotFinT;
              if (slotInicioT < minInicioT) minInicioT = slotInicioT;
              if (slotFinT > maxFinT) maxFinT = slotFinT;
              break;
            }
            slotInicioT += 5;
          }
        }
      }
      minSpanTeorico = maxFinT === -Infinity ? 0 : (maxFinT - minInicioT);
    }
    const maxSpanPermitido = minSpanTeorico + 15; // 15 minutos de tolerancia global


    // --- CÁLCULO DE PUNTOS CANDIDATOS ---
    const ahora = new Date();
    const ahoraLocal = new Date(ahora.getTime() + ZONA_OFFSET_H * 3600000);
    const esHoy = fecha === `${ahoraLocal.getUTCFullYear()}-${String(ahoraLocal.getUTCMonth() + 1).padStart(2, '0')}-${String(ahoraLocal.getUTCDate()).padStart(2, '0')}`;
    const minutosActuales = esHoy ? ahoraLocal.getUTCHours() * 60 + ahoraLocal.getUTCMinutes() + 15 : 0;

    const puntosExactos = new Set<number>();
    for (const pid of profIds) {
      profData[pid].horarios.forEach(h => puntosExactos.add(h.inicio));
      profData[pid].bloques.forEach(b => puntosExactos.add(b.fin));
    }
    if (esHoy) puntosExactos.add(minutosActuales);

    const todosLosPuntos = new Set<number>();
    for (let slot = 0; slot < 24 * 60; slot += 5) {
      if (esHoy && slot < minutosActuales) continue;
      todosLosPuntos.add(slot);
    }
    puntosExactos.forEach(p => {
      if (!esHoy || p >= minutosActuales) todosLosPuntos.add(p);
    });

    // --- EVALUAR CADA PUNTO CANDIDATO (ALGORITMO ROMPECABEZAS PARALELO) ---
    const slotsDisponibles: string[] = [];

    for (const slot of [...todosLosPuntos].sort((a, b) => a - b)) {
      let secuenciaValida = true;
      let alguienEmpiezaEnSlot = false;

      // Calendario virtual para la simulación
      const bloquesVirtuales: { [pid: string]: { inicio: number, fin: number }[] } = {};
      for (const pid of profIds) bloquesVirtuales[pid] = [];

      for (const personaServicios of personas) {
        let tiempoActual = slot;

        for (let i = 0; i < personaServicios.length; i++) {
          const srv = personaServicios[i];
          const pData = profData[srv.profesionalId];

          let slotInicio = tiempoActual;
          let encontroHueco = false;
          // Buscar un hueco libre hacia adelante (máximo 4 horas para tener flexibilidad de empaquetado)
          const limiteBusqueda = slot + 240;
          while (slotInicio <= limiteBusqueda) {
            const slotFin = slotInicio + srv.duracionMin;

            // ¿En horario?
            const enHorario = pData.horarios.some(h => slotInicio >= h.inicio && slotFin <= h.fin);
            if (!enHorario) {
              slotInicio += 5;
              continue;
            }

            // ¿Choca con bloque real?
            const ocupadoReal = pData.bloques.some(b => slotInicio < b.fin && slotFin > b.inicio);
            if (ocupadoReal) {
              slotInicio += 5;
              continue;
            }

            // ¿Choca con bloque virtual de otra persona agendada en esta misma simulación?
            const ocupadoVirtual = bloquesVirtuales[srv.profesionalId].some(b => slotInicio < b.fin && slotFin > b.inicio);
            if (ocupadoVirtual) {
              slotInicio += 5;
              continue;
            }

            encontroHueco = true;
            if (i === 0 && slotInicio === slot) {
              alguienEmpiezaEnSlot = true;
            }

            bloquesVirtuales[srv.profesionalId].push({ inicio: slotInicio, fin: slotFin });
            tiempoActual = slotFin; // El siguiente servicio de ESTA persona empieza cuando termine este
            break;
          }

          if (!encontroHueco) {
            secuenciaValida = false;
            break;
          }
        }

        if (!secuenciaValida) break;
      }

      if (secuenciaValida) {
        let minInicioSlot = Infinity;
        let maxFinSlot = -Infinity;
        for (const pid of profIds) {
          for (const b of bloquesVirtuales[pid]) {
            if (b.inicio < minInicioSlot) minInicioSlot = b.inicio;
            if (b.fin > maxFinSlot) maxFinSlot = b.fin;
          }
        }
        const spanActual = maxFinSlot - minInicioSlot;
        if (spanActual > maxSpanPermitido) {
          secuenciaValida = false;
        }
      }

      if (secuenciaValida && alguienEmpiezaEnSlot) {
        slotsDisponibles.push(minutosAHora24(slot));
      }
    }

    const slotsUnicos = [...new Set(slotsDisponibles)].sort();


    return NextResponse.json({
      slots: slotsUnicos,
      fecha,
      disponible: slotsUnicos.length > 0
    });

  } catch (error) {
    console.error('[disponibilidad]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
