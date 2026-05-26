import { supabase } from '@/lib/supabaseClient';
import { Cliente } from '@/nucleo/entidades/Cliente';

export class RepositorioClientes {
  async obtenerPorTelefono(telefono: string): Promise<Cliente | null> {
    // Limpiamos de caracteres no numéricos para comparación
    const limpio = telefono.replace(/\D/g, '');
    
    // Consultamos intentando varias combinaciones comunes:
    // 1. El string original exacto
    // 2. Con "+" y prefijo de país: "+57XXXXXXXXXX"
    // 3. Con prefijo de país sin "+": "57XXXXXXXXXX"
    // 4. Solo 10 dígitos sin prefijo: "XXXXXXXXXX"
    const variantes = [
      telefono,
      `+${limpio}`,
      limpio,
      limpio.startsWith('57') ? limpio.substring(2) : `57${limpio}`,
      limpio.startsWith('57') ? `+${limpio.substring(2)}` : `+57${limpio}`
    ];
    
    // Hacemos un set para quedarnos solo con valores únicos
    const valoresUnicos = Array.from(new Set(variantes.filter(Boolean)));

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .in('telefono', valoresUnicos)
      .limit(1)
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

  async obtenerPorId(id: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error obteniendo cliente por id: ${error.message}`);
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

  async actualizarPerfil(
    id: string, 
    nombre: string, 
    correo: string, 
    cedula: string, 
    fechaCumpleanos: Date | null
  ): Promise<void> {
    const { error } = await supabase
      .from('clientes')
      .update({
        nombre,
        correo,
        cedula,
        fecha_cumpleanos: fechaCumpleanos ? fechaCumpleanos.toISOString().split('T')[0] : null,
      })
      .eq('id', id);

    if (error) throw new Error(`Error actualizando perfil: ${error.message}`);
  }
}
