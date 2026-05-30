import { supabase } from '@/lib/supabaseClient';

export interface OtpRecord {
  id: string;
  telefono: string;
  codigo: string;
  expiresAt: Date;
  usado: boolean;
  createdAt: Date;
}

export class RepositorioOtps {
  async crear(telefono: string, codigo: string, expiresAt: Date): Promise<void> {
    const { error } = await supabase.from('codigos_otp').insert({
      telefono,
      codigo,
      expires_at: expiresAt.toISOString(),
      usado: false
    });

    if (error) throw new Error(`Error creando OTP: ${error.message}`);
  }

  async obtenerValido(telefono: string, codigo: string): Promise<OtpRecord | null> {
    const { data, error } = await supabase
      .from('codigos_otp')
      .select('*')
      .eq('telefono', telefono)
      .eq('codigo', codigo)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Error consultando OTP: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      telefono: data.telefono,
      codigo: data.codigo,
      expiresAt: new Date(data.expires_at),
      usado: data.usado,
      createdAt: new Date(data.created_at)
    };
  }

  async marcarComoUsado(id: string): Promise<void> {
    const { error } = await supabase
      .from('codigos_otp')
      .update({ usado: true })
      .eq('id', id);

    if (error) throw new Error(`Error marcando OTP como usado: ${error.message}`);
  }

  async invalidarAnteriores(telefono: string): Promise<void> {
    const { error } = await supabase
      .from('codigos_otp')
      .update({ usado: true }) // Marcar como usado para invalidarlo
      .eq('telefono', telefono)
      .eq('usado', false);

    if (error) throw new Error(`Error invalidando OTPs anteriores: ${error.message}`);
  }
}
