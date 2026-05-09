export class AdaptadorCalendarioGoogle {
  constructor(private credentials?: any) {}

  /**
   * Lee los eventos ocupados directamente de Google Calendar usando la API oficial.
   */
  async obtenerEventosOcupados(calendarioId: string, fechaInicio: Date, fechaFin: Date): Promise<{ inicio: Date; fin: Date }[]> {
    // WIP: Se conectará la Google Calendar API en el Sprint 2
    // Se usará una Service Account o OAuth para leer el estado Busy/Free
    
    return [];
  }
}
