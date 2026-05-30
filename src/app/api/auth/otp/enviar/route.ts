import { NextRequest, NextResponse } from 'next/server';

import { RepositorioClientes } from '@/adaptadores/repositorios/RepositorioClientes';
import { RepositorioOtps } from '@/adaptadores/repositorios/RepositorioOtps';

const repositiorioClientes = new RepositorioClientes();
const repositorioOtps = new RepositorioOtps();

export async function POST(request: NextRequest) {
  try {
    const { telefono } = await request.json();

    if (!telefono) {
      return NextResponse.json({ error: 'El número de teléfono es obligatorio' }, { status: 400 });
    }

    // Limpiar teléfono de caracteres no numéricos
    const telefonoLimpio = telefono.replace(/\D/g, '');
    if (telefonoLimpio.length < 10) {
      return NextResponse.json({ error: 'El número de teléfono debe tener al menos 10 dígitos' }, { status: 400 });
    }

    // Asegurar código de país 57 si no está presente
    let telefonoFormateado = telefonoLimpio.length === 10 ? `57${telefonoLimpio}` : telefonoLimpio;

    // 1. Validar que el cliente exista en la base de datos
    // Nota: Como obtnerPorTelefono puede buscar por número limpio o formateado, intentamos ambos
    let cliente = await repositiorioClientes.obtenerPorTelefono(telefonoFormateado);
    if (!cliente && telefonoFormateado.startsWith('57')) {
      // Buscar también sin el código de país por si se guardó solo de 10 dígitos
      cliente = await repositiorioClientes.obtenerPorTelefono(telefonoFormateado.substring(2));
    }

    if (!cliente) {
      return NextResponse.json({
        error: 'No encontramos registros asociados a este número de teléfono. Realiza un agendamiento primero.'
      }, { status: 404 });
    }

    // Normalizar el teléfono al registrado oficialmente en la base de datos (limpiándolo de caracteres no numéricos)
    const telefonoClienteLimpio = cliente.telefono.replace(/\D/g, '');
    telefonoFormateado = telefonoClienteLimpio.length === 10 ? `57${telefonoClienteLimpio}` : telefonoClienteLimpio;

    // 2. Generar el código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expira en 10 minutos

    // 3. Persistir en base de datos
    await repositorioOtps.invalidarAnteriores(telefonoFormateado);
    await repositorioOtps.crear(telefonoFormateado, codigo, expiresAt);

    // 4. Enviar vía Webhook a n8n
    const n8nWebhookUrl = process.env.N8N_OTP_WEBHOOK_URL;
    let mensajeEnviado = false;

    if (n8nWebhookUrl) {
      try {
        const payload = {
          telefono: telefonoFormateado,
          codigo: codigo
        };

        const res = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          mensajeEnviado = true;
        } else {
          console.error(`Error al enviar el webhook a n8n: código HTTP ${res.status}`);
        }
      } catch (err) {
        console.error('Excepción al conectar con el webhook de n8n:', err);
      }
    } else {
      console.warn('Advertencia: N8N_OTP_WEBHOOK_URL no está configurada en las variables de entorno.');
    }

    // Responder al cliente
    // Si falló el envío del webhook, fallamos la API para no comprometer la seguridad
    if (!mensajeEnviado) {
      return NextResponse.json(
        { error: 'No se pudo enviar el código de seguridad a tu WhatsApp. Por favor, verifica tu número o intenta más tarde.' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[OTP Enviar API Error]', error);
    return NextResponse.json({ error: 'Error interno al procesar el código de acceso' }, { status: 500 });
  }
}
