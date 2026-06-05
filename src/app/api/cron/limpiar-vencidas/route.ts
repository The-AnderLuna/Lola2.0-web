import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/cron/limpiar-vencidas
 * Cron job que limpia las citas cuyos temporizadores (expires_at) ya caducaron:
 * 1. Pasa las citas PRE_AGENDADA a CANCELADA_FALTA_PAGO
 * 2. Elimina físicamente las citas BLOQUEO_TEMPORAL (basura del paso 2)
 * 
 * Configurar en cron-job.org o n8n para que corra cada 1 a 5 minutos.
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // 1. Convertir PRE_AGENDADA vencidas a CANCELADA_FALTA_PAGO
    const { data: preAgendadasVencidas, error: err1 } = await supabaseAdmin
      .from('citas')
      .update({ estado: 'CANCELADA_FALTA_PAGO' })
      .eq('estado', 'PRE_AGENDADA')
      .lt('expires_at', now)
      .select('id');

    if (err1) throw err1;

    // 2. Eliminar BLOQUEO_TEMPORAL vencidos (limpieza de basura)
    const { data: bloqueosVencidos, error: err2 } = await supabaseAdmin
      .from('citas')
      .delete()
      .eq('estado', 'BLOQUEO_TEMPORAL')
      .lt('expires_at', now)
      .select('id');

    if (err2) throw err2;

    const countCanceladas = preAgendadasVencidas?.length || 0;
    const countEliminadas = bloqueosVencidos?.length || 0;

    console.log(`[cron/limpiar-vencidas] Canceladas por falta de pago: ${countCanceladas}. Bloqueos temporales eliminados: ${countEliminadas}.`);

    return NextResponse.json({
      success: true,
      canceladasFaltaPago: countCanceladas,
      bloqueosEliminados: countEliminadas,
      timestamp: now
    });
  } catch (error: any) {
    console.error('[cron/limpiar-vencidas] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
