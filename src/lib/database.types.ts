export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      citas: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          duracion_min: number
          estado: string
          expires_at: string | null
          fecha_hora_fin: string
          fecha_hora_inicio: string
          grupo_id: string | null
          id: string
          metodo_pago: string | null
          notas: string | null
          precio_total: number
          profesional_id: string | null
          reserva_titular_id: string | null
          servicio_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          duracion_min: number
          estado?: string
          expires_at?: string | null
          fecha_hora_fin: string
          fecha_hora_inicio: string
          grupo_id?: string | null
          id?: string
          metodo_pago?: string | null
          notas?: string | null
          precio_total: number
          profesional_id?: string | null
          reserva_titular_id?: string | null
          servicio_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          duracion_min?: number
          estado?: string
          expires_at?: string | null
          fecha_hora_fin?: string
          fecha_hora_inicio?: string
          grupo_id?: string | null
          id?: string
          metodo_pago?: string | null
          notas?: string | null
          precio_total?: number
          profesional_id?: string | null
          reserva_titular_id?: string | null
          servicio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_profesional_id_fkey"
            columns: ["profesional_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_reserva_titular_id_fkey"
            columns: ["reserva_titular_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bloqueado: boolean | null
          bot_pausado_hasta: string | null
          cedula: string | null
          correo: string | null
          created_at: string | null
          cumple_enviado: string | null
          fecha_cumpleanos: string | null
          id: string
          nombre: string | null
          telefono: string
        }
        Insert: {
          bloqueado?: boolean | null
          bot_pausado_hasta?: string | null
          cedula?: string | null
          correo?: string | null
          created_at?: string | null
          cumple_enviado?: string | null
          fecha_cumpleanos?: string | null
          id?: string
          nombre?: string | null
          telefono: string
        }
        Update: {
          bloqueado?: boolean | null
          bot_pausado_hasta?: string | null
          cedula?: string | null
          correo?: string | null
          created_at?: string | null
          cumple_enviado?: string | null
          fecha_cumpleanos?: string | null
          id?: string
          nombre?: string | null
          telefono?: string
        }
        Relationships: []
      }
      codigos_otp: {
        Row: {
          codigo: string
          created_at: string
          expires_at: string
          id: string
          telefono: string
          usado: boolean
        }
        Insert: {
          codigo: string
          created_at?: string
          expires_at: string
          id?: string
          telefono: string
          usado?: boolean
        }
        Update: {
          codigo?: string
          created_at?: string
          expires_at?: string
          id?: string
          telefono?: string
          usado?: boolean
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          acepta_sistecredito: boolean | null
          acepta_tarjeta: boolean | null
          admin_telegram_id: string | null
          bot_activo: boolean | null
          created_at: string | null
          daviplata_numero: string | null
          dias_reagendar: number | null
          id: string
          mensaje_bienvenida: string | null
          nequi_numero: string | null
          politica_cancelacion: number | null
          porcentaje_anticipo: number | null
          recargo_tarjeta_porcentaje: number | null
          telegram_bot_token: string | null
          telegram_topic_atencion_cliente: number | null
          telegram_topic_pagos: number | null
          telegram_topic_pagos_restantes: number | null
          titular_cuenta: string | null
          ubicacion_maps: string | null
          ubicacion_texto: string | null
          whatsapp_numero: string | null
        }
        Insert: {
          acepta_sistecredito?: boolean | null
          acepta_tarjeta?: boolean | null
          admin_telegram_id?: string | null
          bot_activo?: boolean | null
          created_at?: string | null
          daviplata_numero?: string | null
          dias_reagendar?: number | null
          id?: string
          mensaje_bienvenida?: string | null
          nequi_numero?: string | null
          politica_cancelacion?: number | null
          porcentaje_anticipo?: number | null
          recargo_tarjeta_porcentaje?: number | null
          telegram_bot_token?: string | null
          telegram_topic_atencion_cliente?: number | null
          telegram_topic_pagos?: number | null
          telegram_topic_pagos_restantes?: number | null
          titular_cuenta?: string | null
          ubicacion_maps?: string | null
          ubicacion_texto?: string | null
          whatsapp_numero?: string | null
        }
        Update: {
          acepta_sistecredito?: boolean | null
          acepta_tarjeta?: boolean | null
          admin_telegram_id?: string | null
          bot_activo?: boolean | null
          created_at?: string | null
          daviplata_numero?: string | null
          dias_reagendar?: number | null
          id?: string
          mensaje_bienvenida?: string | null
          nequi_numero?: string | null
          politica_cancelacion?: number | null
          porcentaje_anticipo?: number | null
          recargo_tarjeta_porcentaje?: number | null
          telegram_bot_token?: string | null
          telegram_topic_atencion_cliente?: number | null
          telegram_topic_pagos?: number | null
          telegram_topic_pagos_restantes?: number | null
          titular_cuenta?: string | null
          ubicacion_maps?: string | null
          ubicacion_texto?: string | null
          whatsapp_numero?: string | null
        }
        Relationships: []
      }
      horarios: {
        Row: {
          created_at: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: string
          profesional_id: string | null
        }
        Insert: {
          created_at?: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: string
          profesional_id?: string | null
        }
        Update: {
          created_at?: string | null
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
          profesional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horarios_profesional_id_fkey"
            columns: ["profesional_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          cita_id: string | null
          comprobante_url: string | null
          created_at: string | null
          estado: string
          id: string
          metodo: string
          monto: number
        }
        Insert: {
          cita_id?: string | null
          comprobante_url?: string | null
          created_at?: string | null
          estado?: string
          id?: string
          metodo: string
          monto: number
        }
        Update: {
          cita_id?: string | null
          comprobante_url?: string | null
          created_at?: string | null
          estado?: string
          id?: string
          metodo?: string
          monto?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cita_id_fkey"
            columns: ["cita_id"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
        ]
      }
      profesionales: {
        Row: {
          activo: boolean | null
          calendario_id: string | null
          created_at: string | null
          id: string
          nombre: string
          rol: string
        }
        Insert: {
          activo?: boolean | null
          calendario_id?: string | null
          created_at?: string | null
          id?: string
          nombre: string
          rol: string
        }
        Update: {
          activo?: boolean | null
          calendario_id?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
          rol?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          abono_requerido: number | null
          activo: boolean | null
          buffer_min: number | null
          categoria: string
          created_at: string | null
          dias_prox_sesion: number | null
          duracion_min: number
          es_tratamiento: boolean | null
          guion_venta: string | null
          id: string
          nombre: string
          precio: number
          requiere_humano: boolean | null
          responsable: string | null
          total_sesiones: number | null
        }
        Insert: {
          abono_requerido?: number | null
          activo?: boolean | null
          buffer_min?: number | null
          categoria: string
          created_at?: string | null
          dias_prox_sesion?: number | null
          duracion_min: number
          es_tratamiento?: boolean | null
          guion_venta?: string | null
          id?: string
          nombre: string
          precio: number
          requiere_humano?: boolean | null
          responsable?: string | null
          total_sesiones?: number | null
        }
        Update: {
          abono_requerido?: number | null
          activo?: boolean | null
          buffer_min?: number | null
          categoria?: string
          created_at?: string | null
          dias_prox_sesion?: number | null
          duracion_min?: number
          es_tratamiento?: boolean | null
          guion_venta?: string | null
          id?: string
          nombre?: string
          precio?: number
          requiere_humano?: boolean | null
          responsable?: string | null
          total_sesiones?: number | null
        }
        Relationships: []
      }
      tratamientos_activos: {
        Row: {
          cita_origen_id: string | null
          cliente_id: string | null
          created_at: string | null
          estado: string | null
          fecha_prox_ideal: string | null
          fecha_ultima_cita: string | null
          id: string
          notas: string | null
          saldo_pendiente: number | null
          servicio_id: string | null
          sesion_actual: number | null
          total_sesiones: number
          updated_at: string | null
        }
        Insert: {
          cita_origen_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_prox_ideal?: string | null
          fecha_ultima_cita?: string | null
          id?: string
          notas?: string | null
          saldo_pendiente?: number | null
          servicio_id?: string | null
          sesion_actual?: number | null
          total_sesiones: number
          updated_at?: string | null
        }
        Update: {
          cita_origen_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_prox_ideal?: string | null
          fecha_ultima_cita?: string | null
          id?: string
          notas?: string | null
          saldo_pendiente?: number | null
          servicio_id?: string | null
          sesion_actual?: number | null
          total_sesiones?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tratamientos_activos_cita_origen_id_fkey"
            columns: ["cita_origen_id"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratamientos_activos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratamientos_activos_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_locks: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
