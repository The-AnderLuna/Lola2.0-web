import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RepositorioClientes } from "@/adaptadores/repositorios/RepositorioClientes";
import FormularioPerfil from "./FormularioPerfil";

const repositorioClientes = new RepositorioClientes();

export default async function PerfilPage() {
  // 1. Obtener y validar la cookie de sesión
  const cookieStore = await cookies();
  const clienteId = cookieStore.get("lola_client_session")?.value;

  if (!clienteId) {
    redirect("/mis-citas");
  }

  // 2. Obtener los datos del cliente
  const cliente = await repositorioClientes.obtenerPorId(clienteId);

  if (!cliente) {
    // Si el cliente no existe, limpiamos cookie y redirigimos
    cookieStore.delete("lola_client_session");
    redirect("/mis-citas");
  }

  // 3. Serializar los datos del cliente a un objeto plano para el Client Component
  const clienteMapeado = {
    id: cliente.id,
    nombre: cliente.nombre || "",
    correo: cliente.correo || "",
    cedula: cliente.cedula || "",
    fechaCumpleanos: cliente.fechaCumpleanos ? cliente.fechaCumpleanos.toISOString() : "",
    telefono: cliente.telefono,
  };

  return <FormularioPerfil cliente={clienteMapeado} />;
}
