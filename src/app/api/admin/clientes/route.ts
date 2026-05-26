import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    let query = supabaseAdmin
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100);

    if (q) {
      query = query.or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,cedula.ilike.%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [], total: count });
  } catch (error) {
    console.error('Error clientes:', error);
    return NextResponse.json({ error: 'Error obteniendo clientes' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabaseAdmin.from('clientes').update(updates).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return NextResponse.json({ error: 'Error actualizando cliente' }, { status: 500 });
  }
}
