import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RepositorioClientes } from "@/adaptadores/repositorios/RepositorioClientes";
import { RepositorioCitas } from "@/adaptadores/repositorios/RepositorioCitas";
import { RepositorioServicios } from "@/adaptadores/repositorios/RepositorioServicios";
import { RepositorioProfesionales } from "@/adaptadores/repositorios/RepositorioProfesionales";
import { RepositorioConfiguracion } from "@/adaptadores/repositorios/RepositorioConfiguracion";
import DashboardCliente from "./DashboardCliente";

const repositorioClientes = new RepositorioClientes();
const repositorioCitas = new RepositorioCitas();
const repositorioServicios = new RepositorioServicios();
const repositorioProfesionales = new RepositorioProfesionales();
const repositorioConfiguracion = new RepositorioConfiguracion();

export default async function PortalPage() {
  // 1. Obtener y validar la cookie de sesión
  const cookieStore = await cookies();
  const clienteId = cookieStore.get("lola_client_session")?.value;

  if (!clienteId) {
    redirect("/mis-citas");
  }

  // 2. Obtener los datos del cliente
  const cliente = await repositorioClientes.obtenerPorId(clienteId);

  if (!cliente) {
    // Si la cookie existe pero el cliente no (borrado o corrupto), limpiamos cookie y redirigimos
    cookieStore.delete("lola_client_session");
    redirect("/mis-citas");
  }

  // 3. Obtener citas, servicios, profesionales y configuracion de forma paralela para rendimiento óptimo
  const [citasRaw, servicios, profesionales, configuracion] = await Promise.all([
    repositorioCitas.obtenerPorClienteId(clienteId),
    repositorioServicios.obtenerActivos(),
    repositorioProfesionales.obtenerActivos(),
    repositorioConfiguracion.obtenerConfiguracion(),
  ]);

  // Crear diccionarios de mapeo para IDs a nombres legibles
  const mapaServicios = new Map(servicios.map(s => [s.id, s.nombre]));
  const mapaProfesionales = new Map(profesionales.map(p => [p.id, p.nombre]));

  // Obtener nombres de clientes para mostrar en reservas compartidas
  const clientesIdsSet = new Set<string>();
  citasRaw.forEach(c => {
    if (c.clienteId) clientesIdsSet.add(c.clienteId);
    if (c.reservaTitularId) clientesIdsSet.add(c.reservaTitularId);
  });
  
  const clientesExtra = await Promise.all(
    Array.from(clientesIdsSet).map(id => repositorioClientes.obtenerPorId(id))
  );
  const mapaClientes = new Map(clientesExtra.filter(c => c !== null).map(c => [c!.id, c!.nombre || "Cliente"]));

  // 4. Mapear citas a objetos planos serializables para pasarlos al Client Component
  const citasMapeadas = citasRaw.map(cita => ({
    id: cita.id,
    clienteId: cita.clienteId,
    servicioId: cita.servicioId,
    servicioNombre: mapaServicios.get(cita.servicioId) || "Servicio Especializado",
    profesionalId: cita.profesionalId,
    profesionalNombre: mapaProfesionales.get(cita.profesionalId) || "Especialista Lola",
    fechaHoraInicio: cita.fechaHoraInicio.toISOString(),
    fechaHoraFin: cita.fechaHoraFin.toISOString(),
    duracionMin: cita.duracionMin,
    precioTotal: cita.precioTotal,
    estado: cita.estado,
    expiresAt: cita.expiresAt ? cita.expiresAt.toISOString() : null,
    grupoId: cita.grupoId || null,
    reservaTitularId: cita.reservaTitularId || null,
    clienteNombre: mapaClientes.get(cita.clienteId) || "Cliente",
    titularNombre: cita.reservaTitularId ? mapaClientes.get(cita.reservaTitularId) || "Titular" : null,
    notas: cita.notas || null,
  }));

  // Renderizar el Dashboard premium pasándole los datos
  return (
    <DashboardCliente
      cliente={{
        id: cliente.id,
        nombre: cliente.nombre || "Clienta Lola",
        telefono: cliente.telefono,
      }}
      whatsappNumero={configuracion.whatsapp_numero || "573138865616"}
      citasIniciales={citasMapeadas}
    />
  );
}
