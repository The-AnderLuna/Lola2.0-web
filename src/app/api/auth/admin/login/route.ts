import { NextResponse } from 'next/server';
import { validateAdminCredentials, generateAdminToken, ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const isValid = validateAdminCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }

    const token = generateAdminToken();

    const response = NextResponse.json({ success: true, message: 'Login exitoso' });

    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
