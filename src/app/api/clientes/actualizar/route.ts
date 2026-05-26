import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RepositorioClientes } from '@/adaptadores/repositorios/RepositorioClientes';

const repositorioClientes = new RepositorioClientes();

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener y validar la sesión
    const cookieStore = await cookies();
    const clienteIdSession = cookieStore.get('lola_client_session')?.value;

    if (!clienteIdSession) {
      return NextResponse.json({ error: 'No autorizado. Por favor inicia sesión nuevamente.' }, { status: 401 });
    }

    // 2. Obtener los datos del request
    const { nombre, correo, cedula, fechaCumpleanos } = await request.json();

    // 3. Validar campos básicos
    if (!nombre || nombre.trim() === '') {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    // Validar formato de correo si es provisto
    if (correo && correo.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        return NextResponse.json({ error: 'El formato de correo electrónico no es válido.' }, { status: 400 });
      }
    }

    // Parsear fecha de cumpleaños si es provista
    let parsedFechaCumpleanos: Date | null = null;
    if (fechaCumpleanos && fechaCumpleanos.trim() !== '') {
      parsedFechaCumpleanos = new Date(fechaCumpleanos);
      if (isNaN(parsedFechaCumpleanos.getTime())) {
        return NextResponse.json({ error: 'La fecha de cumpleaños no es válida.' }, { status: 400 });
      }
    }

    // 4. Actualizar el perfil del cliente
    await repositorioClientes.actualizarPerfil(
      clienteIdSession,
      nombre.trim(),
      correo ? correo.trim() : null,
      cedula ? cedula.trim() : null,
      parsedFechaCumpleanos
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Tu perfil ha sido actualizado correctamente.' 
    });

  } catch (error: any) {
    console.error('[Clientes Actualizar API Error]', error);
    return NextResponse.json({ error: error.message || 'Error interno al actualizar el perfil' }, { status: 500 });
  }
}
