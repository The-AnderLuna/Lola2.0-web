import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const fecha = searchParams.get('fecha');
    const profesionalId = searchParams.get('profesional_id');
    const busqueda = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('citas')
      .select('*, clientes(id, nombre, telefono, cedula), servicios(nombre, categoria, precio), profesionales(nombre, rol)', { count: 'exact' })
      .not('estado', 'eq', 'BLOQUEO_TEMPORAL')
      .order('fecha_hora_inicio', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (fecha) {
      const dayStart = new Date(fecha);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(fecha);
      dayEnd.setHours(23, 59, 59, 999);
      query = query.gte('fecha_hora_inicio', dayStart.toISOString()).lte('fecha_hora_inicio', dayEnd.toISOString());
    }

    if (profesionalId) {
      query = query.eq('profesional_id', profesionalId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Filtrar por búsqueda de cliente (nombre o teléfono) en el servidor
    let filteredData = data || [];
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filteredData = filteredData.filter(c =>
        c.clientes?.nombre?.toLowerCase().includes(q) ||
        c.clientes?.telefono?.includes(q) ||
        c.clientes?.cedula?.includes(q)
      );
    }

    return NextResponse.json({ data: filteredData, total: count });
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    return NextResponse.json({ error: 'Error obteniendo citas' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return NextResponse.json({ error: 'ID y estado son requeridos' }, { status: 400 });
    }

    const validEstados = ['PRE_AGENDADA', 'EN_REVISION', 'CONFIRMADA', 'REAGENDADA', 'CANCELADA', 'COMPLETADA', 'NO_ASISTIO'];
    if (!validEstados.includes(estado)) {
      return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('citas')
      .update({ estado })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Cita actualizada a ${estado}` });
  } catch (error) {
    console.error('Error actualizando cita:', error);
    return NextResponse.json({ error: 'Error actualizando cita' }, { status: 500 });
  }
}
