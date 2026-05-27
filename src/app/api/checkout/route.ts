import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function findOrCreateCliente(datos: any): Promise<string> {
  let query = supabase.from('clientes').select('id');
  if (datos.cedula) query = query.eq('cedula', datos.cedula);
  else if (datos.email) query = query.eq('correo', datos.email);
  else query = query.eq('telefono', datos.telefono);

  const { data: clienteExistente } = await query.limit(1).single();

  if (clienteExistente) {
    const updateData: any = {};
    if (datos.nombre) updateData.nombre = datos.nombre;
    if (datos.telefono) updateData.telefono = datos.telefono;
    if (datos.email) updateData.correo = datos.email;
    if (datos.cedula) updateData.cedula = datos.cedula;
    if (datos.cumpleanos) updateData.fecha_cumpleanos = datos.cumpleanos;

    await supabase.from('clientes').update(updateData).eq('id', clienteExistente.id);
    return clienteExistente.id;
  } else {
    const nuevoId = crypto.randomUUID();
    const { error } = await supabase.from('clientes').insert({
      id: nuevoId,
      nombre: datos.nombre,
      telefono: datos.telefono,
      correo: datos.email || null,
      cedula: datos.cedula || null,
      fecha_cumpleanos: datos.cumpleanos || null,
    });
    if (error) throw error;
    return nuevoId;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bloqueoId, cliente, amiga, metodoPago, totalAbono, serviciosTitularIds, serviciosAmigaIds, cuponId, totalPrecio } = await request.json();

    if (!bloqueoId || !cliente || !cliente.nombre || !cliente.telefono) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 1. Cliente (Titular)
    const clienteId = await findOrCreateCliente(cliente);

    // 1.2 Registrar uso de cupón
    if (cuponId) {
      const { error: errRpc } = await supabase.rpc('increment_cupon_uso', { cupon_id: cuponId });
      if (errRpc) console.error("Error al incrementar uso de cupón:", errRpc);
      
      const { error: errHistorial } = await supabase.from('cupones_historial').insert({
        cupon_id: cuponId,
        cliente_id: clienteId
      });
      if (errHistorial) console.error("Error al guardar historial de cupón:", errHistorial);
    }

    // 1.5 Verificar anti-fraude SOLO para la titular
    const { data: citasPendientes, error: errPendientes } = await supabase
      .from('citas')
      .select('fecha_hora_inicio, servicios(nombre)')
      .eq('cliente_id', clienteId)
      .eq('estado', 'PRE_AGENDADA')
      .limit(1);

    if (errPendientes) throw errPendientes;

    if (citasPendientes && citasPendientes.length > 0) {
      const cita = citasPendientes[0];
      const fecha = new Date(cita.fecha_hora_inicio);
      const fechaTexto = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
      const horaTexto = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const servicios = cita.servicios as any;
      const servicioNombre = Array.isArray(servicios) ? servicios[0]?.nombre : servicios?.nombre;
      
      const mensaje = `Actualmente tienes una reserva pendiente de pago para "${servicioNombre || 'tu servicio'}" el ${fechaTexto} a las ${horaTexto}. Por favor envía el comprobante de esa reserva a WhatsApp o visita la sección de Mis Citas para cancelarla y agendar una nueva.`;
      return NextResponse.json({ error: mensaje }, { status: 403 });
    }

    // 2. Cliente (Amiga) opcional
    let amigaId: string | null = null;
    if (amiga && amiga.nombre && amiga.telefono) {
      amigaId = await findOrCreateCliente(amiga);
    }

    // 3. Actualizar Citas
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora para pagar

    // 3.5 Ajustar el precio_total en la base de datos si hubo un descuento
    let descuentoAplicado = 0;
    if (totalPrecio !== undefined && cuponId) {
      const { data: citasGrupo } = await supabase.from('citas').select('id, precio_total').eq('grupo_id', bloqueoId).order('created_at', { ascending: true });
      if (citasGrupo && citasGrupo.length > 0) {
        const sumaOriginal = citasGrupo.reduce((sum, c) => sum + Number(c.precio_total), 0);
        if (sumaOriginal > totalPrecio) {
          descuentoAplicado = sumaOriginal - totalPrecio;
          // Le restamos el descuento completo a la primera cita del grupo
          await supabase.from('citas').update({
            precio_total: citasGrupo[0].precio_total - descuentoAplicado
          }).eq('id', citasGrupo[0].id);
        }
      }
    }

    if (serviciosTitularIds && serviciosTitularIds.length > 0) {
      // Reserva Compartida
      const { error: err1 } = await supabase.from('citas').update({
        cliente_id: clienteId,
        estado: 'PRE_AGENDADA',
        metodo_pago: metodoPago,
        notas: `Abono Compartida Esperado: $${totalAbono}`,
        expires_at: expiresAt.toISOString(),
      }).in('id', serviciosTitularIds).eq('grupo_id', bloqueoId);
      if (err1) throw err1;

      if (amigaId && serviciosAmigaIds && serviciosAmigaIds.length > 0) {
        const { error: err2 } = await supabase.from('citas').update({
          cliente_id: amigaId,
          reserva_titular_id: clienteId,
          estado: 'PRE_AGENDADA',
          metodo_pago: metodoPago,
          notas: `Amiga de Titular. Abono Compartida Esperado: $${totalAbono}`,
          expires_at: expiresAt.toISOString(),
        }).in('id', serviciosAmigaIds).eq('grupo_id', bloqueoId);
        if (err2) throw err2;
      }
    } else {
      // Modo Tradicional (1 sola persona)
      const { error: errCitas } = await supabase.from('citas').update({
        cliente_id: clienteId,
        estado: 'PRE_AGENDADA',
        metodo_pago: metodoPago,
        notas: `Total Abono Esperado: $${totalAbono}`,
        expires_at: expiresAt.toISOString(),
      }).eq('grupo_id', bloqueoId).eq('estado', 'BLOQUEO_TEMPORAL');
      
      if (errCitas) throw errCitas;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[checkout POST]', error);
    return NextResponse.json({ error: 'Error procesando la reserva' }, { status: 500 });
  }
}
