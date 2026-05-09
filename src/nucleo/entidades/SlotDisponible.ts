export class SlotDisponible {
  constructor(
    public readonly fechaHoraInicio: Date,
    public readonly fechaHoraFin: Date,
    public readonly profesionalId: string
  ) {}
}
