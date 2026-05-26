import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { data, error } = await supabaseAdmin
      .from('configuracion')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error configuración:', error);
    return NextResponse.json({ error: 'Error obteniendo configuración' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const updates = await request.json();

    // Obtener el ID de la configuración existente
    const { data: config } = await supabaseAdmin
      .from('configuracion')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({ error: 'No se encontró configuración' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('configuracion')
      .update(updates)
      .eq('id', config.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    return NextResponse.json({ error: 'Error actualizando configuración' }, { status: 500 });
  }
}
