export class Profesional {
  constructor(
    public readonly id: string,
    public nombre: string,
    public rol: string,
    public activo: boolean,
    public calendarioId?: string | null
  ) {}
}
