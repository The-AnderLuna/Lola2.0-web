import { supabase } from '@/lib/supabaseClient';
import { Cliente } from '@/nucleo/entidades/Cliente';

export class RepositorioClientes {
  async obtenerPorTelefono(telefono: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefono', telefono)
      .maybeSingle();

    if (error) throw new Error(`Error obteniendo cliente: ${error.message}`);
    if (!data) return null;

    return new Cliente(
      data.id,
      data.telefono,
      data.nombre,
      data.correo,
      data.cedula,
      data.fecha_cumpleanos ? new Date(data.fecha_cumpleanos) : undefined,
      data.bloqueado ?? false,
      data.bot_pausado_hasta ? new Date(data.bot_pausado_hasta) : undefined,
      data.cumple_enviado ? new Date(data.cumple_enviado) : undefined,
      data.created_at ? new Date(data.created_at) : new Date()
    );
  }

  async crear(cliente: Cliente): Promise<void> {
    const { error } = await supabase.from('clientes').insert({
      id: cliente.id,
      telefono: cliente.telefono,
      nombre: cliente.nombre,
      correo: cliente.correo,
      cedula: cliente.cedula,
      fecha_cumpleanos: cliente.fechaCumpleanos ? cliente.fechaCumpleanos.toISOString().split('T')[0] : null,
      bloqueado: cliente.bloqueado,
    });

    if (error) throw new Error(`Error creando cliente: ${error.message}`);
  }
}
