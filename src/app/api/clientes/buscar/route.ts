import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get('telefono');

    if (!telefono) {
      return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('nombre, telefono, correo, cedula, fecha_cumpleanos')
      .eq('telefono', telefono)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No encontrado
        return NextResponse.json({ encontrado: false });
      }
      throw error;
    }

    return NextResponse.json({
      encontrado: true,
      cliente: {
        nombre: cliente.nombre || '',
        email: cliente.correo || '',
        cedula: cliente.cedula || '',
        cumpleanos: cliente.fecha_cumpleanos || ''
      }
    });

  } catch (error) {
    console.error('[clientes buscar GET]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
