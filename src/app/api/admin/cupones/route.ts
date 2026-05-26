import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('cupones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Admin GET cupones]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cupon = await request.json();
    cupon.codigo = cupon.codigo.toUpperCase().trim();
    
    // Si viene sin id es creación
    if (!cupon.id) {
      delete cupon.id; // Evitar pasar id undefined o null
      const { data, error } = await supabaseAdmin
        .from('cupones')
        .insert([cupon])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'El código de cupón ya existe' }, { status: 400 });
        throw error;
      }
      return NextResponse.json(data);
    } else {
      // Es actualización
      const { id, ...rest } = cupon;
      const { data, error } = await supabaseAdmin
        .from('cupones')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('[Admin POST cupones]', error);
    return NextResponse.json({ error: 'Error al guardar cupón' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabaseAdmin.from('cupones').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin DELETE cupones]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
