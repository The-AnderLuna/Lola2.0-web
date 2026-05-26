import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { data, error } = await supabaseAdmin
      .from('servicios')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error servicios:', error);
    return NextResponse.json({ error: 'Error obteniendo servicios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { nombre, categoria, precio, duracion_min, abono_requerido, buffer_min, responsable, es_tratamiento, requiere_humano, total_sesiones, guion_venta } = body;

    if (!nombre || !categoria || !precio || !duracion_min) {
      return NextResponse.json({ error: 'Nombre, categoría, precio y duración son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('servicios').insert({
      nombre, categoria, precio, duracion_min,
      abono_requerido: abono_requerido || 0,
      buffer_min: buffer_min || 0,
      responsable: responsable || 'COMPARTIDO',
      es_tratamiento: es_tratamiento || false,
      requiere_humano: requiere_humano || false,
      total_sesiones: total_sesiones || null,
      guion_venta: guion_venta || null,
      activo: true,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('Error creando servicio:', error);
    return NextResponse.json({ error: 'Error creando servicio' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabaseAdmin.from('servicios').update(updates).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando servicio:', error);
    return NextResponse.json({ error: 'Error actualizando servicio' }, { status: 500 });
  }
}
