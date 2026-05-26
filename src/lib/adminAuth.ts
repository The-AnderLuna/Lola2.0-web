import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'lola_admin_session';

/**
 * Genera un token de sesión simple hasheando el secreto con un timestamp.
 */
export function generateAdminToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || 'fallback-secret';
  const timestamp = Date.now().toString();
  // Token simple: base64(secret:timestamp)
  const token = Buffer.from(`${secret}:${timestamp}`).toString('base64');
  return token;
}

/**
 * Valida el token de admin verificando que contenga el secreto correcto.
 */
export function validateAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [secret] = decoded.split(':');
    return secret === (process.env.ADMIN_SESSION_SECRET || 'fallback-secret');
  } catch {
    return false;
  }
}

/**
 * Valida las credenciales de admin contra las variables de entorno.
 */
export function validateAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL o ADMIN_PASSWORD no configurados en .env.local');
    return false;
  }

  return email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword;
}

/**
 * Verifica si la request actual tiene una sesión de admin válida.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  return validateAdminToken(token);
}

/**
 * Helper para API routes: responde 401 si no hay sesión admin.
 */
export async function requireAdminAuth(): Promise<Response | null> {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}

export { ADMIN_SESSION_COOKIE };
