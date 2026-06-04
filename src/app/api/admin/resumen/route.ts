import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const rango = searchParams.get('rango') || 'hoy';

    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (rango === '7d') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    } else if (rango === '30d') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    }

    const startISO = startDate.toISOString();
    const endISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    // Consultas paralelas para métricas del rango
    const [citasRango, preAgendas, clientesNuevos, ingresosSemana] = await Promise.all([
      // 1. Citas del rango (todos los estados excepto BLOQUEO_TEMPORAL y canceladas por sistema)
      supabaseAdmin
        .from('citas')
        .select('*, clientes!citas_cliente_id_fkey(nombre, telefono), servicios(nombre, categoria), profesionales(nombre)')
        .gte('fecha_hora_inicio', startISO)
        .lte('fecha_hora_inicio', endISO)
        .not('estado', 'eq', 'BLOQUEO_TEMPORAL')
        .order('fecha_hora_inicio', { ascending: true }),

      // 2. Pre-agendas activas (todas, no solo de hoy)
      supabaseAdmin
        .from('citas')
        .select('id, expires_at, fecha_hora_inicio, precio_total, clientes!citas_cliente_id_fkey(nombre), servicios(nombre)')
        .eq('estado', 'PRE_AGENDADA')
        .order('expires_at', { ascending: true }),

      // 3. Clientes nuevos en el rango
      supabaseAdmin
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startISO),

      // 4. Ingresos últimos 7 días (para el gráfico, fijo a 7 días por ahora)
      supabaseAdmin
        .from('citas')
        .select('fecha_hora_inicio, precio_total')
        .gte('fecha_hora_inicio', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in('estado', ['CONFIRMADA', 'COMPLETADA']),
    ]);

    // Calcular ingresos del rango
    const ingresoHoy = (citasRango.data || [])
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
      citasHoy: citasRango.data || [],
      totalCitasHoy: (citasRango.data || []).length,
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
