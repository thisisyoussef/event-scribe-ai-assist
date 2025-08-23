
export interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  start_datetime: string;
  end_datetime: string;
  sms_enabled: boolean;
  day_before_time: string;
  day_of_time: string;
  status: 'draft' | 'published';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Optional joined data for sharing
  event_shares?: EventShare[];
  shared_with_me?: EventShare[];
}

export interface VolunteerRole {
  id: string;
  event_id: string;
  role_label: string;
  shift_start: string;
  shift_end: string;
  slots_brother: number;
  slots_sister: number;
  suggested_poc?: string;
  notes?: string;
  created_at?: string;
}

export interface Volunteer {
  id: string;
  event_id: string;
  role_id: string;
  name: string;
  phone: string;
  gender: 'brother' | 'sister';
  notes?: string;
  signup_date?: string;
  status: 'confirmed' | 'cancelled';
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  source: 'manual' | 'volunteer_signup';
  event_id?: string;
  role_id?: string;
  created_at: string;
  updated_at: string;
  // Optional joined data
  events?: { title: string };
  volunteer_roles?: { role_label: string };
}

export interface EventShare {
  id: string;
  event_id: string;
  shared_by: string;
  shared_with: string;
  permission_level: 'view' | 'edit';
  created_at: string;
  updated_at: string;
  // Optional joined data
  event?: Event;
  shared_by_user?: { email: string };
  shared_with_user?: { email: string };
}

export interface SharedEventAccess {
  event: Event;
  permission_level: 'view' | 'edit';
  shared_by: string;
  shared_at: string;
}

// RPC function return types
export interface SharedEventDetail {
  event: Event;
  volunteer_roles: VolunteerRole[];
  volunteers: Volunteer[];
}

// Database function types
export interface Database {
  public: {
    Functions: {
      get_shared_events_with_meta: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          title: string;
          description?: string;
          location: string;
          start_datetime: string;
          end_datetime: string;
          sms_enabled: boolean;
          day_before_time: string;
          day_of_time: string;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          permission_level: string;
          shared_by: string;
          shared_at: string;
        }>;
      };
      get_shared_event_detail: {
        Args: { p_event_id: string };
        Returns: SharedEventDetail[];
      };
    };
  };
}
