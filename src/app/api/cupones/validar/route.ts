import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');
    const totalRaw = searchParams.get('total');
    const telefono = searchParams.get('telefono');

    if (!codigo || !totalRaw) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const total = parseInt(totalRaw, 10);
    if (isNaN(total)) {
      return NextResponse.json({ error: 'Total inválido' }, { status: 400 });
    }

    const { data: cupon, error } = await supabase
      .from('cupones')
      .select('*')
      .eq('codigo', codigo.toUpperCase().trim())
      .single();

    if (error || !cupon) {
      return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 });
    }

    if (!cupon.activo) {
      return NextResponse.json({ error: 'Este cupón está inactivo' }, { status: 400 });
    }

    if (cupon.max_usos !== null && cupon.usos_actuales >= cupon.max_usos) {
      return NextResponse.json({ error: 'Este cupón ya alcanzó su límite total de usos' }, { status: 400 });
    }

    if (cupon.fecha_expiracion && new Date(cupon.fecha_expiracion) < new Date()) {
      return NextResponse.json({ error: 'Este cupón ha expirado' }, { status: 400 });
    }

    // --- REVISIÓN DE UN USO POR CLIENTE ---
    if (telefono) {
      // 1. Buscamos al cliente
      const { data: cliente } = await supabase.from('clientes').select('id').eq('telefono', telefono).limit(1).single();
      
      if (cliente) {
        // 2. Buscamos si ya lo usó en el historial
        const { data: historial } = await supabase
          .from('cupones_historial')
          .select('id')
          .eq('cupon_id', cupon.id)
          .eq('cliente_id', cliente.id)
          .limit(1)
          .single();
          
        if (historial) {
          return NextResponse.json({ error: 'Ya has utilizado este cupón anteriormente' }, { status: 400 });
        }
      }
    }

    let descuento = 0;
    if (cupon.tipo === 'porcentaje') {
      descuento = Math.floor(total * (cupon.valor / 100));
    } else if (cupon.tipo === 'fijo') {
      descuento = cupon.valor;
    }

    // Ensure we don't discount more than the total
    if (descuento > total) descuento = total;

    const nuevoTotal = total - descuento;
    const nuevoAbono = Math.floor(nuevoTotal / 2); // Abono 50% as requested

    return NextResponse.json({
      valido: true,
      cuponId: cupon.id,
      codigo: cupon.codigo,
      tipo: cupon.tipo,
      valor: cupon.valor,
      descuento,
      nuevoTotal,
      nuevoAbono,
      mensaje: `Cupón aplicado: ${cupon.tipo === 'porcentaje' ? cupon.valor + '%' : '$' + cupon.valor.toLocaleString('es-CO')} de descuento`
    });

  } catch (error) {
    console.error('[cupones validar GET]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
