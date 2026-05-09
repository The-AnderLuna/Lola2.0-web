import { RepositorioCitas } from '@/adaptadores/repositorios/RepositorioCitas';
import { RepositorioProfesionales } from '@/adaptadores/repositorios/RepositorioProfesionales';
import { SlotDisponible } from '../entidades/SlotDisponible';

export class ServicioDisponibilidad {
  constructor(
    private repoCitas: RepositorioCitas,
    private repoProfesionales: RepositorioProfesionales
  ) {}

  /**
   * Calcula los slots disponibles para un profesional en una fecha específica,
   * cruzando el horario base, las citas existentes en Supabase y (futuro) Google Calendar.
   */
  async obtenerDisponibilidad(fecha: Date, profesionalId: string, duracionMin: number, bufferMin: number): Promise<SlotDisponible[]> {
    // 1. Obtener horario base del profesional para ese día de la semana
    // 2. Obtener eventos ocupados de Google Calendar
    // 3. Obtener citas activas de Supabase para ese día
    // 4. Calcular intersección de tiempo libre y generar slots de [duracionMin + bufferMin]
    
    // WIP: Se implementará la lógica algorítmica en el Sprint 2
    return [];
  }
}
