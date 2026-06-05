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
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch all relevant citas with both cliente relations
    let query = supabaseAdmin
      .from('citas')
      .select(
        '*, clientes!citas_cliente_id_fkey(id, nombre, telefono, cedula), clientes_titular:clientes!citas_reserva_titular_id_fkey(id, nombre, telefono), servicios(nombre, categoria, precio), profesionales(nombre, rol), pagos(monto, estado)',
        { count: 'exact' }
      )
      .not('estado', 'eq', 'BLOQUEO_TEMPORAL')
      .not('estado', 'eq', 'CANCELADA_SISTEMA')
      .not('estado', 'eq', 'CANCELADA_FALTA_PAGO')
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
      query = query
        .gte('fecha_hora_inicio', dayStart.toISOString())
        .lte('fecha_hora_inicio', dayEnd.toISOString());
    }

    if (profesionalId) {
      query = query.eq('profesional_id', profesionalId);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    let filteredData = data || [];

    // Apply search filter
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filteredData = filteredData.filter((c) =>
        c.clientes?.nombre?.toLowerCase().includes(q) ||
        c.clientes?.telefono?.includes(q) ||
        c.clientes?.cedula?.includes(q) ||
        c.clientes_titular?.nombre?.toLowerCase().includes(q)
      );
    }

    // ── Group citas by grupo_id ──────────────────────────────────────────────
    // For the admin view we want ONE row per group (or per individual cita).
    // The "group row" shows total price, duration, and lists all sub-services.
    // Matches the same grouping logic used in the client DashboardCliente.

    const gruposProcesados = new Set<string>();
    const grouped: any[] = [];

    filteredData.forEach((cita) => {
      if (cita.grupo_id) {
        if (gruposProcesados.has(cita.grupo_id)) return; // already processed
        gruposProcesados.add(cita.grupo_id);

        const grupo = filteredData.filter((c) => c.grupo_id === cita.grupo_id);

        // Sort group members chronologically
        grupo.sort(
          (a, b) =>
            new Date(a.fecha_hora_inicio).getTime() -
            new Date(b.fecha_hora_inicio).getTime()
        );

        // A single cita with grupo_id is NOT a real group — treat as individual
        if (grupo.length === 1) {
          grouped.push({ ...grupo[0], es_grupo: false, sub_citas: [] });
          return;
        }

        const base = grupo[0]; // earliest cita is the "header" record
        const maxEnd = new Date(
          Math.max(...grupo.map((c) => new Date(c.fecha_hora_fin).getTime()))
        ).toISOString();

        // Determine if it's a "group of friends" or a "service package"
        // Same logic as DashboardCliente: check reserva_titular_id OR distinct client names
        const hasReservaTitular = grupo.some(
          (c) => c.reserva_titular_id !== null && c.reserva_titular_id !== undefined
        );
        const clienteNames = new Set(
          grupo.map((c) => c.clientes?.nombre || 'Cliente')
        );
        const isAmigas = hasReservaTitular || clienteNames.size > 1;

        grouped.push({
          ...base,
          // Override aggregated fields
          fecha_hora_fin: maxEnd,
          duracion_min: grupo.reduce((sum, c) => sum + c.duracion_min, 0),
          precio_total: grupo.reduce((sum, c) => sum + c.precio_total, 0),
          // Metadata for display
          es_grupo: true,
          tipo_grupo: isAmigas ? 'AMIGAS' : 'PAQUETE',
          cantidad_citas: grupo.length,
          // Sub-services for expanded view (includes clienteNombre for grouping)
          sub_citas: grupo.map((c) => ({
            id: c.id,
            estado: c.estado,
            fecha_hora_inicio: c.fecha_hora_inicio,
            fecha_hora_fin: c.fecha_hora_fin,
            duracion_min: c.duracion_min,
            precio_total: c.precio_total,
            clientes: c.clientes,
            clientes_titular: c.clientes_titular,
            servicios: c.servicios,
            profesionales: c.profesionales,
          })),
        });
      } else {
        // Individual cita (no group)
        grouped.push({ ...cita, es_grupo: false, sub_citas: [] });
      }
    });

    return NextResponse.json({ data: grouped, total: grouped.length });
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
    const { id, estado, grupo_id } = body;

    if (!id || !estado) {
      return NextResponse.json({ error: 'ID y estado son requeridos' }, { status: 400 });
    }

    const validEstados = [
      'PRE_AGENDADA', 'EN_REVISION', 'CONFIRMADA', 'REAGENDADA',
      'CANCELADA', 'CANCELADA_POR_CLIENTE', 'COMPLETADA', 'NO_ASISTIO',
    ];
    if (!validEstados.includes(estado)) {
      return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
    }

    // If grupo_id provided, update ALL citas in the group
    if (grupo_id) {
      const { error } = await supabaseAdmin
        .from('citas')
        .update({ estado })
        .eq('grupo_id', grupo_id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('citas')
        .update({ estado })
        .eq('id', id);
      if (error) throw error;
    }

    // Disparar Webhook a n8n si se confirma manualmente
    if (estado === 'CONFIRMADA') {
      const webhookUrl = process.env.N8N_WEBHOOK_CONFIRM_URL;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_cita: id,
            grupo_id: grupo_id || null,
            origen: 'panel_admin',
            pago_abono: 0 // Si se confirma manual, asumimos abono previo 0 (debe todo)
          })
        }).catch(err => console.error('Error disparando webhook de n8n:', err));
      } else {
        console.warn('⚠️ N8N_WEBHOOK_CONFIRM_URL no está configurada en las variables de entorno.');
      }
    }

    return NextResponse.json({ success: true, message: `Cita(s) actualizadas a ${estado}` });
  } catch (error) {
    console.error('Error actualizando cita:', error);
    return NextResponse.json({ error: 'Error actualizando cita' }, { status: 500 });
  }
}
