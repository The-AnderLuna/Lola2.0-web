import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const metodo = searchParams.get('metodo');

    let query = supabaseAdmin
      .from('pagos')
      .select('*, citas(fecha_hora_inicio, precio_total, clientes(nombre, telefono), servicios(nombre))')
      .order('created_at', { ascending: false });

    if (estado) query = query.eq('estado', estado);
    if (metodo) query = query.eq('metodo', metodo);

    const { data, error } = await query;
    if (error) throw error;

    // Calcular métricas financieras
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const aprobados = (data || []).filter(p => p.estado === 'APROBADO');

    const ingresoHoy = aprobados
      .filter(p => new Date(p.created_at!) >= todayStart)
      .reduce((s, p) => s + p.monto, 0);

    const ingresoSemana = aprobados
      .filter(p => new Date(p.created_at!) >= weekStart)
      .reduce((s, p) => s + p.monto, 0);

    const ingresoMes = aprobados
      .filter(p => new Date(p.created_at!) >= monthStart)
      .reduce((s, p) => s + p.monto, 0);

    const pendientes = (data || []).filter(p => ['PENDIENTE', 'REVISION'].includes(p.estado)).length;

    return NextResponse.json({
      data: data || [],
      metricas: { ingresoHoy, ingresoSemana, ingresoMes, pendientes },
    });
  } catch (error) {
    console.error('Error pagos:', error);
    return NextResponse.json({ error: 'Error obteniendo pagos' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { id, estado } = await request.json();
    if (!id || !estado) return NextResponse.json({ error: 'ID y estado requeridos' }, { status: 400 });

    const { error } = await supabaseAdmin.from('pagos').update({ estado }).eq('id', id);
    if (error) throw error;

    // Si se aprueba, actualizar la cita asociada a CONFIRMADA
    if (estado === 'APROBADO') {
      const { data: pago } = await supabaseAdmin.from('pagos').select('cita_id').eq('id', id).maybeSingle();
      if (pago?.cita_id) {
        await supabaseAdmin.from('citas').update({ estado: 'CONFIRMADA' }).eq('id', pago.cita_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error pagos patch:', error);
    return NextResponse.json({ error: 'Error actualizando pago' }, { status: 500 });
  }
}
