import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RepositorioClientes } from '@/adaptadores/repositorios/RepositorioClientes';
import { RepositorioOtps } from '@/adaptadores/repositorios/RepositorioOtps';

const repositiorioClientes = new RepositorioClientes();
const repositorioOtps = new RepositorioOtps();

export async function POST(request: NextRequest) {
  try {
    const { telefono, codigo } = await request.json();

    if (!telefono || !codigo) {
      return NextResponse.json({ error: 'Teléfono y código son obligatorios' }, { status: 400 });
    }

    // Limpiar teléfono
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const telefonoFormateado = telefonoLimpio.length === 10 ? `57${telefonoLimpio}` : telefonoLimpio;

    // 1. Verificar OTP en la base de datos
    const otp = await repositorioOtps.obtenerValido(telefonoFormateado, codigo);

    if (!otp) {
      // Intentar también sin el prefijo por si el cliente se registró sin él y el OTP se guardó diferente
      const otpAlternativo = telefonoFormateado.startsWith('57') 
        ? await repositorioOtps.obtenerValido(telefonoFormateado.substring(2), codigo)
        : null;

      if (!otpAlternativo) {
        return NextResponse.json({
          error: 'El código de acceso es incorrecto o ha expirado. Solicita un nuevo código.'
        }, { status: 401 });
      }
      
      // Si el alternativo es válido, marcarlo como usado
      await repositorioOtps.marcarComoUsado(otpAlternativo.id);
    } else {
      // Marcar OTP como usado
      await repositorioOtps.marcarComoUsado(otp.id);
    }

    // 2. Obtener el cliente para obtener su ID
    let cliente = await repositiorioClientes.obtenerPorTelefono(telefonoFormateado);
    if (!cliente && telefonoFormateado.startsWith('57')) {
      cliente = await repositiorioClientes.obtenerPorTelefono(telefonoFormateado.substring(2));
    }

    if (!cliente) {
      return NextResponse.json({ error: 'Error al recuperar los datos del cliente.' }, { status: 500 });
    }

    // 3. Crear sesión mediante una Cookie segura
    // Nota: cookies() es asíncrono en Next.js 15/16
    const cookieStore = await cookies();
    
    // Guardamos el clienteId de forma segura
    cookieStore.set('lola_client_session', cliente.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días de sesión activa
    });

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
      }
    });

  } catch (error) {
    console.error('[OTP Verificar API Error]', error);
    return NextResponse.json({ error: 'Error interno al verificar el código de acceso' }, { status: 500 });
  }
}
