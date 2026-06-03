import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

/**
 * GET /api/cron/completar-citas
 * Cron job que marca como COMPLETADA todas las citas cuya
 * fecha_hora_fin ya pasó y están en estado CONFIRMADA o EN_REVISION.
 * 
 * Configurar en Vercel Cron Jobs o llamar desde un servicio externo (ej. cron-job.org)
 * con el header Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // Validación de seguridad con secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const ahora = new Date().toISOString();

    const { data, error } = await supabase
      .from('citas')
      .update({ estado: 'COMPLETADA' })
      .lt('fecha_hora_fin', ahora)
      .in('estado', ['CONFIRMADA', 'EN_REVISION', 'PRE_AGENDADA'])
      .select('id');

    if (error) throw error;

    const count = data?.length || 0;
    console.log(`[cron/completar-citas] Marcadas ${count} citas como COMPLETADA`);

    return NextResponse.json({
      success: true,
      completadas: count,
      timestamp: ahora,
    });
  } catch (error: any) {
    console.error('[cron/completar-citas] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
