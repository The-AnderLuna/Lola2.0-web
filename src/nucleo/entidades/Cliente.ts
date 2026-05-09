export class Cliente {
  constructor(
    public readonly id: string,
    public telefono: string,
    public nombre?: string | null,
    public correo?: string | null,
    public cedula?: string | null,
    public fechaCumpleanos?: Date | null,
    public bloqueado: boolean = false,
    public botPausadoHasta?: Date | null,
    public cumpleEnviado?: Date | null,
    public createdAt: Date = new Date()
  ) {}
}
