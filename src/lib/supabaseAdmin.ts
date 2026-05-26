import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con permisos de service_role.
 * SOLO usar en el servidor (API Routes, Server Components).
 * Bypasea RLS — usar con cuidado.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
