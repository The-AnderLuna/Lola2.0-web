import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profesional_id = searchParams.get('profesional_id');

    let query = supabase.from('dias_bloqueados').select('*').order('fecha', { ascending: true });
    
    if (profesional_id) {
      query = query.eq('profesional_id', profesional_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[GET /api/dias-bloqueados]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fecha, fechas, profesional_id, motivo } = body;

    const fechasArray = fechas || (fecha ? [fecha] : []);

    if (fechasArray.length === 0 || !profesional_id) {
      return NextResponse.json({ error: 'Fecha(s) y profesional_id son obligatorios' }, { status: 400 });
    }

    const inserts = fechasArray.map((f: string) => ({ fecha: f, profesional_id, motivo }));

    const { data, error } = await supabase
      .from('dias_bloqueados')
      .insert(inserts)
      .select();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/dias-bloqueados]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 });
    }

    const { error } = await supabase
      .from('dias_bloqueados')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/dias-bloqueados]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
