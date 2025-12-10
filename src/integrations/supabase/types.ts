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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      additional_details: {
        Row: {
          age_groups: string[] | null
          created_at: string | null
          event_id: string
          expected_attendance: number | null
          id: string
          marketing_level: string | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          age_groups?: string[] | null
          created_at?: string | null
          event_id: string
          expected_attendance?: number | null
          id?: string
          marketing_level?: string | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          age_groups?: string[] | null
          created_at?: string | null
          event_id?: string
          expected_attendance?: number | null
          id?: string
          marketing_level?: string | null
          tone?: string | null
          updated_at?: string | null
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
      analytics_tracking: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          event_id: string
          id: string
          ip_address: unknown
          os: string | null
          referrer: string | null
          tracking_type: string
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_id: string
          id?: string
          ip_address?: unknown
          os?: string | null
          referrer?: string | null
          tracking_type: string
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_id?: string
          id?: string
          ip_address?: unknown
          os?: string | null
          referrer?: string | null
          tracking_type?: string
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_tracking_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_visitors: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          first_visit_at: string | null
          id: string
          last_visit_at: string | null
          total_events_visited: number | null
          total_visits: number | null
          updated_at: string | null
          visitor_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          first_visit_at?: string | null
          id?: string
          last_visit_at?: string | null
          total_events_visited?: number | null
          total_visits?: number | null
          updated_at?: string | null
          visitor_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          first_visit_at?: string | null
          id?: string
          last_visit_at?: string | null
          total_events_visited?: number | null
          total_visits?: number | null
          updated_at?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cleanup_logs: {
        Row: {
          cleaned_at: string | null
          event_id: string
          event_title: string
          id: string
          no_show_count: number
          removed_contacts: Json
        }
        Insert: {
          cleaned_at?: string | null
          event_id: string
          event_title: string
          id?: string
          no_show_count: number
          removed_contacts?: Json
        }
        Update: {
          cleaned_at?: string | null
          event_id?: string
          event_title?: string
          id?: string
          no_show_count?: number
          removed_contacts?: Json
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          event_id: string | null
          events_attended_count: number
          gender: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          role_id: string | null
          source: string | null
          updated_at: string | null
          user_id: string
          volunteer_count: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          events_attended_count?: number
          gender?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          role_id?: string | null
          source?: string | null
          updated_at?: string | null
          user_id: string
          volunteer_count?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          events_attended_count?: number
          gender?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          role_id?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string
          volunteer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "volunteer_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_shares: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          permission_level: string
          shared_by: string
          shared_with: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          permission_level: string
          shared_by: string
          shared_with: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          permission_level?: string
          shared_by?: string
          shared_with?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_shares_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_template_details: {
        Row: {
          created_at: string | null
          day_before_time: string | null
          day_of_time: string | null
          description: string | null
          id: string
          location: string
          sms_enabled: boolean | null
          template_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_before_time?: string | null
          day_of_time?: string | null
          description?: string | null
          id?: string
          location: string
          sms_enabled?: boolean | null
          template_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_before_time?: string | null
          day_of_time?: string | null
          description?: string | null
          id?: string
          location?: string
          sms_enabled?: boolean | null
          template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_template_details_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_template_itineraries: {
        Row: {
          activity: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          template_id: string
          time_slot: string
          updated_at: string | null
        }
        Insert: {
          activity: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          template_id: string
          time_slot: string
          updated_at?: string | null
        }
        Update: {
          activity?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          template_id?: string
          time_slot?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_template_itineraries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_template_pre_event_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          due_date_offset_days: number | null
          id: string
          status: string | null
          task_description: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          due_date_offset_days?: number | null
          id?: string
          status?: string | null
          task_description: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          due_date_offset_days?: number | null
          id?: string
          status?: string | null
          task_description?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_template_pre_event_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_template_volunteer_roles: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          role_label: string
          shift_end: string
          shift_start: string
          slots_brother: number | null
          slots_flexible: number
          slots_sister: number | null
          suggested_poc: string | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          role_label: string
          shift_end: string
          shift_start: string
          slots_brother?: number | null
          slots_flexible?: number
          slots_sister?: number | null
          suggested_poc?: string | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          role_label?: string
          shift_end?: string
          shift_start?: string
          slots_brother?: number | null
          slots_flexible?: number
          slots_sister?: number | null
          suggested_poc?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_template_volunteer_roles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          day_before_time: string | null
          day_of_time: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_datetime: string
          id: string
          is_public: boolean | null
          location: string
          sms_enabled: boolean | null
          start_datetime: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          day_before_time?: string | null
          day_of_time?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_datetime: string
          id?: string
          is_public?: boolean | null
          location: string
          sms_enabled?: boolean | null
          start_datetime: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          day_before_time?: string | null
          day_of_time?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_datetime?: string
          id?: string
          is_public?: boolean | null
          location?: string
          sms_enabled?: boolean | null
          start_datetime?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          activity: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          event_id: string
          id: string
          time_slot: string
          updated_at: string | null
        }
        Insert: {
          activity: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_id: string
          id?: string
          time_slot: string
          updated_at?: string | null
        }
        Update: {
          activity?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_id?: string
          id?: string
          time_slot?: string
          updated_at?: string | null
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
      pre_event_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          due_date: string | null
          event_id: string
          id: string
          status: string | null
          task_description: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          event_id: string
          id?: string
          status?: string | null
          task_description: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          event_id?: string
          id?: string
          status?: string | null
          task_description?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_event_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          gender: string | null
          id: string
          is_admin: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          gender?: string | null
          id: string
          is_admin?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          is_admin?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      volunteer_roles: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          itinerary_id: string | null
          notes: string | null
          role_label: string
          shift_end: string
          shift_end_time: string
          shift_start: string
          slots_brother: number | null
          slots_flexible: number
          slots_sister: number | null
          suggested_poc: string[] | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          itinerary_id?: string | null
          notes?: string | null
          role_label: string
          shift_end: string
          shift_end_time: string
          shift_start: string
          slots_brother?: number | null
          slots_flexible?: number
          slots_sister?: number | null
          suggested_poc?: string[] | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          itinerary_id?: string | null
          notes?: string | null
          role_label?: string
          shift_end?: string
          shift_end_time?: string
          shift_start?: string
          slots_brother?: number | null
          slots_flexible?: number
          slots_sister?: number | null
          suggested_poc?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_roles_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_signups: {
        Row: {
          contact_id: string
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          role_id: string
          signup_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          role_id: string
          signup_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          role_id?: string
          signup_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_signups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_signups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_signups_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "volunteer_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          check_in_notes: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          event_id: string
          gender: string
          id: string
          name: string
          notes: string | null
          phone: string
          role_id: string
          signup_date: string | null
          status: string | null
        }
        Insert: {
          check_in_notes?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          event_id: string
          gender: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          role_id: string
          signup_date?: string | null
          status?: string | null
        }
        Update: {
          check_in_notes?: string | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          event_id?: string
          gender?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          role_id?: string
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
    }
    Views: {
      security_monitor: {
        Row: {
          check_time: string | null
          check_type: string | null
          status: string | null
          view_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_admin_mode: { Args: { admin_code: string }; Returns: boolean }
      auto_make_events_public: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: {
          client_ip: unknown
          endpoint_name: string
          max_requests?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_no_show_volunteers: {
        Args: { p_event_id: string }
        Returns: {
          contact_name: string
          contact_phone: string
          removed_contact_id: string
        }[]
      }
      cleanup_no_shows_after_event: {
        Args: never
        Returns: {
          event_id: string
          event_title: string
          no_show_count: number
          removed_contacts: Json
        }[]
      }
      cleanup_old_deleted_events: { Args: never; Returns: number }
      cleanup_old_deleted_templates: { Args: never; Returns: number }
      complete_event_and_cleanup: {
        Args: { p_event_id: string }
        Returns: {
          event_title: string
          no_show_count: number
          removed_contacts: Json
        }[]
      }
      deactivate_admin_mode: { Args: never; Returns: boolean }
      event_is_published_public: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      get_analytics_with_filters: {
        Args: {
          p_countries?: string[]
          p_date_from?: string
          p_date_to?: string
          p_device_types?: string[]
          p_event_id: string
          p_tracking_types?: string[]
        }
        Returns: {
          click_count: number
          country: string
          date_group: string
          device_type: string
          tracking_type: string
          unique_visitors: number
        }[]
      }
      get_event_analytics_summary: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_event_id: string
          p_tracking_type?: string
        }
        Returns: {
          human_clicks: number
          page_views: number
          qr_scans: number
          total_clicks: number
          unique_clicks: number
          visitors: number
        }[]
      }
      get_event_by_slug: {
        Args: { slug: string }
        Returns: {
          description: string
          event_date: string
          id: string
          is_public: boolean
          location: string
          status: string
          title: string
        }[]
      }
      get_event_shares_with_emails: {
        Args: { p_event_id: string }
        Returns: {
          created_at: string
          event_id: string
          id: string
          permission_level: string
          shared_by: string
          shared_by_email: string
          shared_by_full_name: string
          shared_with: string
          shared_with_email: string
          shared_with_full_name: string
          updated_at: string
        }[]
      }
      get_events_shared_by_user: {
        Args: never
        Returns: {
          created_at: string
          created_by: string
          day_before_time: string
          day_of_time: string
          description: string
          end_datetime: string
          id: string
          location: string
          shared_with_emails: string[]
          shared_with_names: string[]
          shares_count: number
          sms_enabled: boolean
          start_datetime: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_no_show_volunteers: {
        Args: { p_event_id: string }
        Returns: {
          role_label: string
          signup_date: string
          volunteer_id: string
          volunteer_name: string
          volunteer_phone: string
        }[]
      }
      get_previously_shared_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          last_shared_at: string
          total_shares: number
          user_id: string
        }[]
      }
      get_shared_event_detail: {
        Args: { p_event_id: string }
        Returns: {
          event: Json
          volunteer_roles: Json
          volunteers: Json
        }[]
      }
      get_shared_events_with_meta: {
        Args: never
        Returns: {
          created_at: string
          created_by: string
          day_before_time: string
          day_of_time: string
          description: string
          end_datetime: string
          id: string
          location: string
          permission_level: string
          shared_at: string
          shared_by: string
          sms_enabled: boolean
          start_datetime: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_volunteer_signups_by_phone: {
        Args: { p_phone: string }
        Returns: {
          event_id: string
          role_id: string
          signup_date: string
          status: string
        }[]
      }
      is_user_poc_for_event: { Args: { p_event_id: string }; Returns: boolean }
      normalize_phone: { Args: { p: string }; Returns: string }
      recalc_events_attended_for_contact: {
        Args: { p_phone: string }
        Returns: undefined
      }
      register_volunteer_public: {
        Args: {
          p_event_id: string
          p_gender: string
          p_name: string
          p_notes: string
          p_phone: string
          p_role_id: string
        }
        Returns: {
          check_in_notes: string | null
          checked_in_at: string | null
          checked_out_at: string | null
          event_id: string
          gender: string
          id: string
          name: string
          notes: string | null
          phone: string
          role_id: string
          signup_date: string | null
          status: string | null
        }
        SetofOptions: {
          from: "*"
          to: "volunteers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_event: {
        Args: { event_id: string; user_id: string }
        Returns: boolean
      }
      restore_event_template: {
        Args: { template_id: string; user_uuid: string }
        Returns: boolean
      }
      soft_delete_event: {
        Args: { event_id: string; user_id: string }
        Returns: boolean
      }
      soft_delete_event_template: {
        Args: { template_id: string; user_uuid: string }
        Returns: boolean
      }
      track_analytics: {
        Args: {
          p_browser?: string
          p_city?: string
          p_country?: string
          p_device_type?: string
          p_event_id: string
          p_ip_address?: unknown
          p_os?: string
          p_referrer?: string
          p_tracking_type: string
          p_user_agent?: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_visitor_id?: string
        }
        Returns: string
      }
      trigger_cleanup_no_shows: { Args: never; Returns: Json }
      update_volunteer_checkin_status: {
        Args: { p_action: string; p_notes?: string; p_volunteer_id: string }
        Returns: undefined
      }
      user_can_edit_event: { Args: { p_event_id: string }; Returns: boolean }
      user_can_view_event: { Args: { p_event_id: string }; Returns: boolean }
      user_is_poc: { Args: never; Returns: boolean }
      validate_event_slug: { Args: { slug: string }; Returns: boolean }
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
