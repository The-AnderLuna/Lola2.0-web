import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    // Consultas paralelas para métricas del día
    const [citasHoy, preAgendas, clientesNuevos, ingresosSemana] = await Promise.all([
      // 1. Citas de hoy (todos los estados excepto BLOQUEO_TEMPORAL y canceladas por sistema)
      supabaseAdmin
        .from('citas')
        .select('*, clientes(nombre, telefono), servicios(nombre, categoria), profesionales(nombre)')
        .gte('fecha_hora_inicio', todayStart)
        .lte('fecha_hora_inicio', todayEnd)
        .not('estado', 'eq', 'BLOQUEO_TEMPORAL')
        .order('fecha_hora_inicio', { ascending: true }),

      // 2. Pre-agendas activas (todas, no solo de hoy)
      supabaseAdmin
        .from('citas')
        .select('id, expires_at, fecha_hora_inicio, precio_total, clientes(nombre), servicios(nombre)')
        .eq('estado', 'PRE_AGENDADA')
        .order('expires_at', { ascending: true }),

      // 3. Clientes nuevos hoy
      supabaseAdmin
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),

      // 4. Ingresos últimos 7 días (citas confirmadas/completadas)
      supabaseAdmin
        .from('citas')
        .select('fecha_hora_inicio, precio_total')
        .gte('fecha_hora_inicio', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in('estado', ['CONFIRMADA', 'COMPLETADA']),
    ]);

    // Calcular ingresos de hoy
    const ingresoHoy = (citasHoy.data || [])
      .filter(c => ['CONFIRMADA', 'COMPLETADA'].includes(c.estado))
      .reduce((sum, c) => sum + (c.precio_total || 0), 0);

    // Calcular ingresos por día (últimos 7 días)
    const diasLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const ingresosPorDia: { label: string; value: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

      const dayTotal = (ingresosSemana.data || [])
        .filter(c => {
          const f = new Date(c.fecha_hora_inicio);
          return f >= dayStart && f <= dayEnd;
        })
        .reduce((sum, c) => sum + (c.precio_total || 0), 0);

      ingresosPorDia.push({
        label: diasLabels[date.getDay()],
        value: dayTotal,
      });
    }

    return NextResponse.json({
      citasHoy: citasHoy.data || [],
      totalCitasHoy: (citasHoy.data || []).length,
      ingresoHoy,
      preAgendas: preAgendas.data || [],
      totalPreAgendas: (preAgendas.data || []).length,
      clientesNuevosHoy: clientesNuevos.count || 0,
      ingresosPorDia,
    });
  } catch (error) {
    console.error('Error en resumen:', error);
    return NextResponse.json({ error: 'Error obteniendo resumen' }, { status: 500 });
  }
}
