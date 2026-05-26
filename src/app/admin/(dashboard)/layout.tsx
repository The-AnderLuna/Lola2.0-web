import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const metadata = {
  title: 'Panel de Control — Milé Almanza',
  description: 'Dashboard administrativo de Milé Almanza Estudio de Estética',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side: verificar sesión admin
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('lola_admin_session')?.value;

  if (!adminSession) {
    redirect('/admin/login');
  }

  // Obtener estado del bot desde configuración
  let botActivo = true;
  try {
    const { data } = await supabaseAdmin
      .from('configuracion')
      .select('bot_activo')
      .limit(1)
      .maybeSingle();

    if (data) {
      botActivo = data.bot_activo ?? true;
    }
  } catch (err) {
    console.error('Error fetching bot status:', err);
  }

  return (
    <AdminShell botActivo={botActivo}>
      {children}
    </AdminShell>
  );
}
