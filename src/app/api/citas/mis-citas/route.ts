import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RepositorioCitas } from '@/adaptadores/repositorios/RepositorioCitas';
import { RepositorioClientes } from '@/adaptadores/repositorios/RepositorioClientes';
import { RepositorioServicios } from '@/adaptadores/repositorios/RepositorioServicios';
import { RepositorioProfesionales } from '@/adaptadores/repositorios/RepositorioProfesionales';

const repositorioCitas = new RepositorioCitas();
const repositorioClientes = new RepositorioClientes();
const repositorioServicios = new RepositorioServicios();
const repositorioProfesionales = new RepositorioProfesionales();

// GET /api/citas/mis-citas
// Retorna las citas de la clienta actualmente autenticada via cookie.
// Usado para el polling silencioso cada N segundos en el Dashboard.
export async function GET() {
  try {
    // 1. Validar la sesión
    const cookieStore = await cookies();
    const clienteId = cookieStore.get('lola_client_session')?.value;

    if (!clienteId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // 2. Verificar que el cliente existe
    const cliente = await repositorioClientes.obtenerPorId(clienteId);
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    }

    // 3. Obtener citas y datos de soporte en paralelo
    const [citasRaw, servicios, profesionales] = await Promise.all([
      repositorioCitas.obtenerPorClienteId(clienteId),
      repositorioServicios.obtenerActivos(),
      repositorioProfesionales.obtenerActivos(),
    ]);

    const mapaServicios = new Map(servicios.map(s => [s.id, s.nombre]));
    const mapaProfesionales = new Map(profesionales.map(p => [p.id, p.nombre]));

    // 4. Resolver nombres de otros clientes en reservas compartidas
    const clientesIdsSet = new Set<string>();
    citasRaw.forEach(c => {
      if (c.clienteId) clientesIdsSet.add(c.clienteId);
      if (c.reservaTitularId) clientesIdsSet.add(c.reservaTitularId);
    });

    const clientesExtra = await Promise.all(
      Array.from(clientesIdsSet).map(id => repositorioClientes.obtenerPorId(id))
    );
    const mapaClientes = new Map(
      clientesExtra.filter(c => c !== null).map(c => [c!.id, c!.nombre || 'Cliente'])
    );

    // 5. Serializar y devolver
    const citas = citasRaw.map(cita => ({
      id: cita.id,
      clienteId: cita.clienteId,
      servicioId: cita.servicioId,
      servicioNombre: mapaServicios.get(cita.servicioId) || 'Servicio Especializado',
      profesionalId: cita.profesionalId,
      profesionalNombre: mapaProfesionales.get(cita.profesionalId) || 'Especialista Lola',
      fechaHoraInicio: cita.fechaHoraInicio.toISOString(),
      fechaHoraFin: cita.fechaHoraFin.toISOString(),
      duracionMin: cita.duracionMin,
      precioTotal: cita.precioTotal,
      estado: cita.estado,
      expiresAt: cita.expiresAt ? cita.expiresAt.toISOString() : null,
      grupoId: cita.grupoId || null,
      reservaTitularId: cita.reservaTitularId || null,
      clienteNombre: mapaClientes.get(cita.clienteId) || 'Cliente',
      titularNombre: cita.reservaTitularId ? (mapaClientes.get(cita.reservaTitularId) || null) : null,
      notas: cita.notas || null,
      metodoPago: cita.metodoPago || null,
      createdAt: cita.createdAt ? cita.createdAt.toISOString() : null,
    }));

    return NextResponse.json({ citas });

  } catch (error) {
    console.error('[mis-citas polling error]', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
