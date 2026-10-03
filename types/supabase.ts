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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accesos_cursos: {
        Row: {
          creado_en: string
          curso_id: string
          id: string
          usuario_id: string
        }
        Insert: {
          creado_en?: string
          curso_id: string
          id?: string
          usuario_id: string
        }
        Update: {
          creado_en?: string
          curso_id?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accesos_cursos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      accesos_simuladores: {
        Row: {
          created_at: string
          id: number
          simulador_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          simulador_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: number
          simulador_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accesos_simuladores_simulador_id_fkey"
            columns: ["simulador_id"]
            isOneToOne: false
            referencedRelation: "simuladores"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_lecciones: {
        Row: {
          adjuntos: string | null
          contenido_html: string | null
          created_at: string | null
          id: string
          simulador_id: string | null
          tema_id: string | null
          tipo: string
          titulo_interno: string
          video_url: string | null
        }
        Insert: {
          adjuntos?: string | null
          contenido_html?: string | null
          created_at?: string | null
          id?: string
          simulador_id?: string | null
          tema_id?: string | null
          tipo?: string
          titulo_interno: string
          video_url?: string | null
        }
        Update: {
          adjuntos?: string | null
          contenido_html?: string | null
          created_at?: string | null
          id?: string
          simulador_id?: string | null
          tema_id?: string | null
          tipo?: string
          titulo_interno?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_lecciones_simulador_id_fkey"
            columns: ["simulador_id"]
            isOneToOne: false
            referencedRelation: "simuladores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_lecciones_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      contenido_modulos: {
        Row: {
          id: string
          is_preview: boolean | null
          leccion_id: string | null
          modulo_id: string | null
          orden: number
          titulo_mostrar: string | null
        }
        Insert: {
          id?: string
          is_preview?: boolean | null
          leccion_id?: string | null
          modulo_id?: string | null
          orden: number
          titulo_mostrar?: string | null
        }
        Update: {
          id?: string
          is_preview?: boolean | null
          leccion_id?: string | null
          modulo_id?: string | null
          orden?: number
          titulo_mostrar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contenido_modulos_leccion_id_fkey"
            columns: ["leccion_id"]
            isOneToOne: false
            referencedRelation: "banco_lecciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contenido_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_curso"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          created_at: string
          descripcion: string | null
          es_pago: boolean | null
          id: string
          imagen_url: string | null
          institucion: string
          is_deleted: boolean | null
          nombre: string
          precio: number | null
          publico: boolean | null
          slug: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          es_pago?: boolean | null
          id?: string
          imagen_url?: string | null
          institucion: string
          is_deleted?: boolean | null
          nombre: string
          precio?: number | null
          publico?: boolean | null
          slug: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          es_pago?: boolean | null
          id?: string
          imagen_url?: string | null
          institucion?: string
          is_deleted?: boolean | null
          nombre?: string
          precio?: number | null
          publico?: boolean | null
          slug?: string
        }
        Relationships: []
      }
      historial_simuladores: {
        Row: {
          created_at: string
          id: string
          puntaje: number
          simulador_id: string
          total_preguntas: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          puntaje: number
          simulador_id: string
          total_preguntas: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          puntaje?: number
          simulador_id?: string
          total_preguntas?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_simuladores_simulador_id_fkey"
            columns: ["simulador_id"]
            isOneToOne: false
            referencedRelation: "simuladores"
            referencedColumns: ["id"]
          },
        ]
      }
      lecciones: {
        Row: {
          adjuntos: Json | null
          contenido_texto: string | null
          created_at: string
          curso_id: string
          id: string
          orden: number
          seccion: string | null
          simulador_id: string | null
          titulo: string
          video_url: string | null
        }
        Insert: {
          adjuntos?: Json | null
          contenido_texto?: string | null
          created_at?: string
          curso_id: string
          id?: string
          orden: number
          seccion?: string | null
          simulador_id?: string | null
          titulo: string
          video_url?: string | null
        }
        Update: {
          adjuntos?: Json | null
          contenido_texto?: string | null
          created_at?: string
          curso_id?: string
          id?: string
          orden?: number
          seccion?: string | null
          simulador_id?: string | null
          titulo?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecciones_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          orden: number
          slug: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          orden?: number
          slug: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          orden?: number
          slug?: string
        }
        Relationships: []
      }
      modulos_curso: {
        Row: {
          created_at: string | null
          curso_id: string | null
          id: string
          orden: number
          parent_id: string | null
          titulo: string
        }
        Insert: {
          created_at?: string | null
          curso_id?: string | null
          id?: string
          orden: number
          parent_id?: string | null
          titulo: string
        }
        Update: {
          created_at?: string | null
          curso_id?: string | null
          id?: string
          orden?: number
          parent_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modulos_curso_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "modulos_curso"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          client_tx_id: string
          confirmado_en: string | null
          creado_en: string
          curso_id: string
          estado: string
          id: string
          monto_centavos: number
          payphone_id: number | null
          usuario_id: string
        }
        Insert: {
          client_tx_id: string
          confirmado_en?: string | null
          creado_en?: string
          curso_id: string
          estado?: string
          id?: string
          monto_centavos: number
          payphone_id?: number | null
          usuario_id: string
        }
        Update: {
          client_tx_id?: string
          confirmado_en?: string | null
          creado_en?: string
          curso_id?: string
          estado?: string
          id?: string
          monto_centavos?: number
          payphone_id?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      preguntas: {
        Row: {
          feedback: string | null
          id: number
          opciones: Json
          orden: number | null
          pregunta: string
          pregunta_img_url: string | null
          respuesta: Json
          simulador_id: string
          tema_id: string | null
          youtube_url: string | null
        }
        Insert: {
          feedback?: string | null
          id?: number
          opciones: Json
          orden?: number | null
          pregunta: string
          pregunta_img_url?: string | null
          respuesta: Json
          simulador_id?: string
          tema_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          feedback?: string | null
          id?: number
          opciones?: Json
          orden?: number | null
          pregunta?: string
          pregunta_img_url?: string | null
          respuesta?: Json
          simulador_id?: string
          tema_id?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preguntas_simulador_id_fkey"
            columns: ["simulador_id"]
            isOneToOne: false
            referencedRelation: "simuladores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preguntas_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      progreso_lecciones: {
        Row: {
          completado_en: string
          id: string
          leccion_id: string
          usuario_id: string
        }
        Insert: {
          completado_en?: string
          id?: string
          leccion_id: string
          usuario_id: string
        }
        Update: {
          completado_en?: string
          id?: string
          leccion_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progreso_lecciones_leccion_id_fkey"
            columns: ["leccion_id"]
            isOneToOne: false
            referencedRelation: "contenido_modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados: {
        Row: {
          aciertos: number
          created_at: string | null
          detalle_respuestas: Json | null
          email: string | null
          id: number
          puntaje: number
          simulador_id: string
          total_preguntas: number
          usuario_id: string | null
        }
        Insert: {
          aciertos: number
          created_at?: string | null
          detalle_respuestas?: Json | null
          email?: string | null
          id?: number
          puntaje: number
          simulador_id?: string
          total_preguntas: number
          usuario_id?: string | null
        }
        Update: {
          aciertos?: number
          created_at?: string | null
          detalle_respuestas?: Json | null
          email?: string | null
          id?: number
          puntaje?: number
          simulador_id?: string
          total_preguntas?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resultados_simulador_id_fkey"
            columns: ["simulador_id"]
            isOneToOne: false
            referencedRelation: "simuladores"
            referencedColumns: ["id"]
          },
        ]
      }
      simulador_preguntas: {
        Row: {
          created_at: string
          id: string
          orden: number
          pregunta_id: number
          simulador_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          orden: number
          pregunta_id: number
          simulador_id: string
        }
        Update: {
          created_at?: string
          id?: string
          orden?: number
          pregunta_id?: number
          simulador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_preguntas_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "preguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulador_preguntas_simulador_id_fkey"
            columns: ["simulador_id"]
            isOneToOne: false
            referencedRelation: "simuladores"
            referencedColumns: ["id"]
          },
        ]
      }
      simuladores: {
        Row: {
          cantidad_preguntas: number
          categoria: string | null
          created_at: string | null
          es_dinamico: boolean
          es_pago: boolean | null
          id: string
          institucion: string | null
          is_deleted: boolean | null
          materia: string | null
          materia_id: string | null
          nombre: string | null
          precio: number | null
          publico: boolean
          slug: string | null
          temas_dinamicos: string[]
        }
        Insert: {
          cantidad_preguntas?: number
          categoria?: string | null
          created_at?: string | null
          es_dinamico?: boolean
          es_pago?: boolean | null
          id?: string
          institucion?: string | null
          is_deleted?: boolean | null
          materia?: string | null
          materia_id?: string | null
          nombre?: string | null
          precio?: number | null
          publico?: boolean
          slug?: string | null
          temas_dinamicos?: string[]
        }
        Update: {
          cantidad_preguntas?: number
          categoria?: string | null
          created_at?: string | null
          es_dinamico?: boolean
          es_pago?: boolean | null
          id?: string
          institucion?: string | null
          is_deleted?: boolean | null
          materia?: string | null
          materia_id?: string | null
          nombre?: string | null
          precio?: number | null
          publico?: boolean
          slug?: string | null
          temas_dinamicos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "simuladores_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      temas: {
        Row: {
          created_at: string
          id: string
          materia_id: string
          nombre: string
          orden: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_id: string
          nombre: string
          orden?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_id?: string
          nombre?: string
          orden?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "temas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dar_acceso_curso: {
        Args: { p_curso_id: string; p_email: string }
        Returns: undefined
      }
      dar_acceso_simulador: {
        Args: { p_email: string; p_simulador_id: string }
        Returns: boolean
      }
      get_dashboard_stats: {
        Args: never
        Returns: {
          promedio_global: number
          total_intentos: number
          total_simuladores: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      preguntas_aleatorias: {
        Args: { p_limite: number; p_temas: string[] }
        Returns: Database["public"]["Tables"]["preguntas"]["Row"][]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
