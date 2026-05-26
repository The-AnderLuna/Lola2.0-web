import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { data: profesionales, error: profError } = await supabaseAdmin
      .from('profesionales')
      .select('*')
      .order('nombre');

    if (profError) throw profError;

    // Obtener horarios de todos los profesionales
    const { data: horarios, error: horError } = await supabaseAdmin
      .from('horarios')
      .select('*')
      .order('dia_semana');

    if (horError) throw horError;

    // Agrupar horarios por profesional
    const profConHorarios = (profesionales || []).map(p => ({
      ...p,
      horarios: (horarios || []).filter(h => h.profesional_id === p.id),
    }));

    return NextResponse.json({ data: profConHorarios });
  } catch (error) {
    console.error('Error staff:', error);
    return NextResponse.json({ error: 'Error obteniendo staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { nombre, rol, calendario_id, horarios } = await request.json();
    if (!nombre || !rol) return NextResponse.json({ error: 'Nombre y rol requeridos' }, { status: 400 });

    const { data: prof, error: profError } = await supabaseAdmin
      .from('profesionales')
      .insert({ nombre, rol, calendario_id: calendario_id || null, activo: true })
      .select()
      .single();

    if (profError) throw profError;

    // Insertar horarios si se proporcionan
    if (horarios && Array.isArray(horarios) && horarios.length > 0) {
      const horariosData = horarios.map((h: { dia_semana: number; hora_inicio: string; hora_fin: string }) => ({
        profesional_id: prof.id,
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
      }));

      await supabaseAdmin.from('horarios').insert(horariosData);
    }

    return NextResponse.json({ data: prof, success: true });
  } catch (error) {
    console.error('Error creando profesional:', error);
    return NextResponse.json({ error: 'Error creando profesional' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, horarios, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    // Actualizar profesional
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from('profesionales').update(updates).eq('id', id);
      if (error) throw error;
    }

    // Actualizar horarios si se proporcionan (replace all)
    if (horarios && Array.isArray(horarios)) {
      // Eliminar horarios existentes
      await supabaseAdmin.from('horarios').delete().eq('profesional_id', id);

      // Insertar nuevos
      if (horarios.length > 0) {
        const horariosData = horarios.map((h: { dia_semana: number; hora_inicio: string; hora_fin: string }) => ({
          profesional_id: id,
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
        }));
        await supabaseAdmin.from('horarios').insert(horariosData);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando profesional:', error);
    return NextResponse.json({ error: 'Error actualizando profesional' }, { status: 500 });
  }
}
