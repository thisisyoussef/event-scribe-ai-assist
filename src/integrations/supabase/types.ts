export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      additional_details: {
        Row: {
          age_groups: string[] | null
          attendance_estimate: number | null
          created_at: string
          event_id: string | null
          id: string
          marketing_level: string | null
          tone: string | null
        }
        Insert: {
          age_groups?: string[] | null
          attendance_estimate?: number | null
          created_at?: string
          event_id?: string | null
          id?: string
          marketing_level?: string | null
          tone?: string | null
        }
        Update: {
          age_groups?: string[] | null
          attendance_estimate?: number | null
          created_at?: string
          event_id?: string | null
          id?: string
          marketing_level?: string | null
          tone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "additional_details_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          day_before_time: string | null
          day_of_time: string | null
          description: string | null
          end_datetime: string
          id: string
          location: string
          sms_enabled: boolean | null
          start_datetime: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          day_before_time?: string | null
          day_of_time?: string | null
          description?: string | null
          end_datetime: string
          id?: string
          location: string
          sms_enabled?: boolean | null
          start_datetime: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          day_before_time?: string | null
          day_of_time?: string | null
          description?: string | null
          end_datetime?: string
          id?: string
          location?: string
          sms_enabled?: boolean | null
          start_datetime?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_forms: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          question_order: number
          question_text: string
          question_type: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          question_order: number
          question_text: string
          question_type?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          question_order?: number
          question_text?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string | null
          rating: number | null
          response_text: string | null
          volunteer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_id?: string | null
          rating?: number | null
          response_text?: string | null
          volunteer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string | null
          rating?: number | null
          response_text?: string | null
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "feedback_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          time_slot: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          time_slot: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          time_slot?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          created_at: string
          id: string
          label: string
          map_link: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          label: string
          map_link?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          label?: string
          map_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_ideas: {
        Row: {
          created_at: string
          effort: string | null
          event_id: string | null
          id: string
          idea_text: string
          impact: string | null
          selected: boolean | null
        }
        Insert: {
          created_at?: string
          effort?: string | null
          event_id?: string | null
          id?: string
          idea_text: string
          impact?: string | null
          selected?: boolean | null
        }
        Update: {
          created_at?: string
          effort?: string | null
          event_id?: string | null
          id?: string
          idea_text?: string
          impact?: string | null
          selected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ideas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          contact_email: string | null
          contact_person: string
          contact_phone: string | null
          created_at: string
          id: string
          org_name: string
          sponsorship_level: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_person: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          org_name: string
          sponsorship_level?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          org_name?: string
          sponsorship_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          roles: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          roles?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          roles?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      volunteer_roles: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          notes: string | null
          role_label: string
          shift_end: string
          shift_start: string
          slots_brother: number | null
          slots_sister: number | null
          suggested_poc: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          role_label: string
          shift_end: string
          shift_start: string
          slots_brother?: number | null
          slots_sister?: number | null
          suggested_poc?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          role_label?: string
          shift_end?: string
          shift_start?: string
          slots_brother?: number | null
          slots_sister?: number | null
          suggested_poc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          event_id: string | null
          gender: string
          id: string
          name: string
          notes: string | null
          phone: string
          role_id: string | null
          signup_date: string | null
          status: string | null
        }
        Insert: {
          event_id?: string | null
          gender?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          role_id?: string | null
          signup_date?: string | null
          status?: string | null
        }
        Update: {
          event_id?: string | null
          gender?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          role_id?: string | null
          signup_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "volunteer_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers_backup: {
        Row: {
          changed_by: string | null
          event_id: string | null
          gender: string
          id: string
          name: string
          new_data: Json | null
          notes: string | null
          old_data: Json | null
          operation_timestamp: string
          operation_type: string
          original_volunteer_id: string
          phone: string
          role_id: string | null
          signup_date: string | null
          status: string | null
        }
        Insert: {
          changed_by?: string | null
          event_id?: string | null
          gender: string
          id?: string
          name: string
          new_data?: Json | null
          notes?: string | null
          old_data?: Json | null
          operation_timestamp?: string
          operation_type: string
          original_volunteer_id: string
          phone: string
          role_id?: string | null
          signup_date?: string | null
          status?: string | null
        }
        Update: {
          changed_by?: string | null
          event_id?: string | null
          gender?: string
          id?: string
          name?: string
          new_data?: Json | null
          notes?: string | null
          old_data?: Json | null
          operation_timestamp?: string
          operation_type?: string
          original_volunteer_id?: string
          phone?: string
          role_id?: string | null
          signup_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      volunteer_activity_log: {
        Row: {
          backup_id: string | null
          event_title: string | null
          name: string | null
          new_data: Json | null
          old_data: Json | null
          operation_timestamp: string | null
          operation_type: string | null
          original_volunteer_id: string | null
          phone: string | null
          role_label: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
