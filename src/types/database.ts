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
      action_plans: {
        Row: {
          assessment_id: string
          created_at: string | null
          created_by: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string
          factor_id: string | null
          id: string
          plan_id: string
          responsible: string
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          status: Database["public"]["Enums"]["action_status"]
          type: Database["public"]["Enums"]["action_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date: string
          factor_id?: string | null
          id?: string
          plan_id: string
          responsible: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["action_status"]
          type?: Database["public"]["Enums"]["action_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string
          factor_id?: string | null
          id?: string
          plan_id?: string
          responsible?: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          status?: Database["public"]["Enums"]["action_status"]
          type?: Database["public"]["Enums"]["action_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approved_at: string | null
          approved_by: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          plan_id: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_answers: {
        Row: {
          assessment_id: string
          clinical_note: string | null
          created_at: string | null
          factor_id: string
          id: string
          question_id: string
          score: number
        }
        Insert: {
          assessment_id: string
          clinical_note?: string | null
          created_at?: string | null
          factor_id: string
          id?: string
          question_id: string
          score: number
        }
        Update: {
          assessment_id?: string
          clinical_note?: string | null
          created_at?: string | null
          factor_id?: string
          id?: string
          question_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_tokens: {
        Row: {
          assessment_id: string
          created_at: string | null
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["token_status"]
          token: string
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          status?: Database["public"]["Enums"]["token_status"]
          token?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["token_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_tokens_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string | null
          created_by: string | null
          cycle: number
          id: string
          mode: Database["public"]["Enums"]["assessment_mode"]
          sector_id: string
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cycle?: number
          id?: string
          mode?: Database["public"]["Enums"]["assessment_mode"]
          sector_id: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cycle?: number
          id?: string
          mode?: Database["public"]["Enums"]["assessment_mode"]
          sector_id?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          economic_sector: string | null
          id: string
          logo_url: string | null
          name: string
          size: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          economic_sector?: string | null
          id?: string
          logo_url?: string | null
          name: string
          size?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          economic_sector?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          size?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          action_id: string
          created_at: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          action_id: string
          created_at?: string | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          action_id?: string
          created_at?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidences_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          assessment_id: string
          created_at: string | null
          created_by: string | null
          factor_id: string
          id: string
          program_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          created_by?: string | null
          factor_id: string
          id?: string
          program_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          created_by?: string | null
          factor_id?: string
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      presentations: {
        Row: {
          assessment_id: string
          created_by: string | null
          generated_at: string | null
          id: string
          pdf_url: string | null
          pptx_url: string | null
        }
        Insert: {
          assessment_id: string
          created_by?: string | null
          generated_at?: string | null
          id?: string
          pdf_url?: string | null
          pptx_url?: string | null
        }
        Update: {
          assessment_id?: string
          created_by?: string | null
          generated_at?: string | null
          id?: string
          pdf_url?: string | null
          pptx_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presentations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          registro_profissional: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          registro_profissional?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          registro_profissional?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["program_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["program_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["program_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          assessment_id: string
          calculated_at: string | null
          factor_id: string
          id: string
          level: Database["public"]["Enums"]["risk_level"]
          score: number
        }
        Insert: {
          assessment_id: string
          calculated_at?: string | null
          factor_id: string
          id?: string
          level: Database["public"]["Enums"]["risk_level"]
          score: number
        }
        Update: {
          assessment_id?: string
          calculated_at?: string | null
          factor_id?: string
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          employee_count: number
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          employee_count?: number
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          employee_count?: number
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          assessments_monthly_limit: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          plan_type: string
          status: string
          user_id: string
        }
        Insert: {
          assessments_monthly_limit?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          plan_type?: string
          status?: string
          user_id: string
        }
        Update: {
          assessments_monthly_limit?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          plan_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_assessment_tokens: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      mark_overdue_actions: { Args: never; Returns: undefined }
    }
    Enums: {
      action_status: "pendente" | "em_andamento" | "concluida" | "atrasada"
      action_type: "preventiva" | "corretiva"
      approval_status: "aprovado" | "com_ressalvas" | "em_revisao"
      assessment_mode: "A" | "B"
      assessment_status: "rascunho" | "em_coleta" | "concluido" | "calculado"
      program_type: "padrao" | "personalizado"
      risk_level: "baixo" | "moderado" | "alto" | "critico"
      token_status: "ativo" | "expirado" | "encerrado"
      user_role: "admin" | "colaborador" | "visualizador"
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

// ─── Alias de tipos derivados dos Enums ──────────────────────────────────────

export type RiskLevel       = Database["public"]["Enums"]["risk_level"]
export type ActionStatus    = Database["public"]["Enums"]["action_status"]
export type ActionType      = Database["public"]["Enums"]["action_type"]
export type ApprovalStatus  = Database["public"]["Enums"]["approval_status"]
export type AssessmentMode  = Database["public"]["Enums"]["assessment_mode"]
export type AssessmentStatus = Database["public"]["Enums"]["assessment_status"]
export type ProgramType     = Database["public"]["Enums"]["program_type"]
export type TokenStatus     = Database["public"]["Enums"]["token_status"]
export type UserRole        = Database["public"]["Enums"]["user_role"]

export const Constants = {
  public: {
    Enums: {
      action_status: ["pendente", "em_andamento", "concluida", "atrasada"],
      action_type: ["preventiva", "corretiva"],
      approval_status: ["aprovado", "com_ressalvas", "em_revisao"],
      assessment_mode: ["A", "B"],
      assessment_status: ["rascunho", "em_coleta", "concluido", "calculado"],
      program_type: ["padrao", "personalizado"],
      risk_level: ["baixo", "moderado", "alto", "critico"],
      token_status: ["ativo", "expirado", "encerrado"],
      user_role: ["admin", "colaborador", "visualizador"],
    },
  },
} as const
