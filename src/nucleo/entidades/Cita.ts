import { EstadoCita } from './Tipos';

export class Cita {
  constructor(
    public readonly id: string,
    public readonly clienteId: string,
    public readonly servicioId: string,
    public readonly profesionalId: string,
    public readonly fechaHoraInicio: Date,
    public readonly fechaHoraFin: Date,
    public readonly duracionMin: number,
    public readonly precioTotal: number,
    public estado: EstadoCita,
    public expiresAt?: Date | null,
    public grupoId?: string | null,
    public createdAt: Date = new Date(),
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
