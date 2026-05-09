export class Servicio {
  constructor(
    public readonly id: string,
    public nombre: string,
    public categoria: string,
    public precio: number,
    public duracionMin: number,
    public abonoRequerido: number,
    public bufferMin: number,
    public requiereHumano: boolean,
    public esTratamiento: boolean,
    public activo: boolean,
    public totalSesiones?: number | null,
    public responsable?: string | null
  ) {}
}
