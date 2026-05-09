import { Cita } from '../entidades/Cita';
import { EstadoCita } from '../entidades/Tipos';
import { RepositorioCitas } from '@/adaptadores/repositorios/RepositorioCitas';

export class ServicioPreAgenda {
  constructor(private repoCitas: RepositorioCitas) {}

  /**
   * Crea una pre-agenda que expirará si no se confirma el pago en 30 minutos.
   */
  async crearPreAgenda(cita: Cita): Promise<Cita> {
    if (cita.estado !== EstadoCita.PRE_AGENDADA) {
      throw new Error('La cita debe iniciar en estado PRE_AGENDADA');
    }

    // Configurar expiración: 30 minutos desde la creación
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    cita.expiresAt = expiresAt;

    await this.repoCitas.crear(cita);
    return cita;
  }
}
