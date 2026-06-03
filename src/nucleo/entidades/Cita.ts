import { EstadoCita } from './Tipos';

export class Cita {
  constructor(
    public readonly id: string,
    public clienteId: string,
    public servicioId: string,
    public profesionalId: string,
    public fechaHoraInicio: Date,
    public fechaHoraFin: Date,
    public duracionMin: number,
    public precioTotal: number,
    public estado: EstadoCita,
    public expiresAt?: Date | null,
    public grupoId?: string | null,
    public reservaTitularId?: string | null,
    public notas?: string | null,
    public createdAt: Date = new Date(),
    public metodoPago?: string | null,
  ) {}

  public estaVencida(): boolean {
    if (this.estado !== EstadoCita.PRE_AGENDADA) {
      return false;
    }
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }

  public puedeSerCancelada(): boolean {
    if (this.fechaHoraInicio < new Date()) {
      return false;
    }
    return [EstadoCita.PRE_AGENDADA, EstadoCita.CONFIRMADA, EstadoCita.EN_REVISION].includes(this.estado);
  }

  public puedeSerReagendada(): boolean {
    if (this.fechaHoraInicio < new Date()) {
      return false;
    }
    return [EstadoCita.CONFIRMADA].includes(this.estado);
  }
}
