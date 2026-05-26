import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ═══════════════════════════════════════════
  // PORTAL DEL CLIENTE — Protección con cookie de sesión del cliente
  // ═══════════════════════════════════════════
  const clientSession = request.cookies.get('lola_client_session')?.value;

  // Si intenta acceder a cualquier ruta dentro de /portal y no tiene sesión,
  // lo redirigimos a la página de login /mis-citas
  if (pathname.startsWith('/portal') && !clientSession) {
    const loginUrl = new URL('/mis-citas', request.url);
    // Conservamos la URL a la que intentaba ir como parámetro de retorno (opcional)
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si ya tiene sesión activa e intenta ir a la página de login,
  // lo redirigimos automáticamente a su panel /portal
  if (pathname === '/mis-citas' && clientSession) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // ═══════════════════════════════════════════
  // DASHBOARD ADMIN — Protección con cookie de sesión admin
  // ═══════════════════════════════════════════
  const adminSession = request.cookies.get('lola_admin_session')?.value;

  // Permitir acceso a la página de login sin sesión
  if (pathname === '/admin/login') {
    // Si ya tiene sesión admin activa, redirigir al dashboard
    if (adminSession) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // Proteger todas las rutas /admin/* (excepto /admin/login que ya se manejó arriba)
  if (pathname.startsWith('/admin') && !adminSession) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Validación básica del token admin (verificamos que sea un base64 válido)
  if (pathname.startsWith('/admin') && adminSession) {
    try {
      const decoded = Buffer.from(adminSession, 'base64').toString('utf-8');
      const [secret] = decoded.split(':');
      const expectedSecret = process.env.ADMIN_SESSION_SECRET || 'fallback-secret';
      if (secret !== expectedSecret) {
        const loginUrl = new URL('/admin/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('lola_admin_session');
        return response;
      }
    } catch {
      const loginUrl = new URL('/admin/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('lola_admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

// Configurar los matchers para interceptar las rutas deseadas
export const config = {
  matcher: ['/portal/:path*', '/mis-citas', '/admin/:path*'],
};
