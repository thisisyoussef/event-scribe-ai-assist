
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
  is_public: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: string;
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
  shift_end_time: string;
  slots_brother: number;
  slots_sister: number;
  slots_flexible: number;
  suggested_poc?: string | string[];
  notes?: string;
  created_at?: string;
  itinerary_id?: string;
  poc_contact?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  poc_contacts?: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
  }>;
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
  checked_in_at?: string;
  checked_out_at?: string;
  check_in_notes?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: 'brother' | 'sister';
  source: 'manual' | 'volunteer_signup' | 'account_signup';
  role?: 'poc' | 'volunteer' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  phone?: string;
  gender?: string;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VolunteerSignup {
  id: string;
  contact_id: string;
  event_id: string;
  role_id: string;
  signup_date: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
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
  // Additional joined data from RPC
  shared_with_profile?: { id: string; email: string; full_name?: string };
  shared_by_profile?: { id: string; email: string; full_name?: string };
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

// New interface for events shared by the current user
export interface EventSharedByUser {
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
  shares_count: number;
  shared_with_emails: string[];
  shared_with_names: string[];
}

// Interface for previously shared users
export interface PreviouslySharedUser {
  user_id: string;
  email: string;
  full_name: string;
  last_shared_at: string;
  total_shares: number;
}

// Analytics interfaces
export interface AnalyticsTracking {
  id: string;
  event_id: string;
  tracking_type: 'link_click' | 'qr_scan' | 'page_view' | 'human_click';
  visitor_id?: string;
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsVisitor {
  id: string;
  visitor_id: string;
  first_visit_at: string;
  last_visit_at: string;
  total_visits: number;
  total_events_visited: number;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  country?: string;
  city?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_clicks: number;
  qr_scans: number;
  human_clicks: number;
  unique_clicks: number;
  visitors: number;
  page_views: number;
}

export interface AnalyticsFilteredData {
  tracking_type: string;
  device_type?: string;
  country?: string;
  click_count: number;
  unique_visitors: number;
  date_group: string;
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  trackingTypes?: string[];
  deviceTypes?: string[];
  countries?: string[];
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
      get_events_shared_by_user: {
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
          shares_count: number;
          shared_with_emails: string[];
          shared_with_names: string[];
        }>;
      };
      get_previously_shared_users: {
        Args: Record<string, never>;
        Returns: Array<{
          user_id: string;
          email: string;
          full_name: string;
          last_shared_at: string;
          total_shares: number;
        }>;
      };
      track_analytics: {
        Args: {
          p_event_id: string;
          p_tracking_type: string;
          p_visitor_id?: string;
          p_user_agent?: string;
          p_ip_address?: string;
          p_referrer?: string;
          p_utm_source?: string;
          p_utm_medium?: string;
          p_utm_campaign?: string;
          p_device_type?: string;
          p_browser?: string;
          p_os?: string;
          p_country?: string;
          p_city?: string;
        };
        Returns: string;
      };
      get_event_analytics_summary: {
        Args: {
          p_event_id: string;
          p_date_from?: string;
          p_date_to?: string;
          p_tracking_type?: string;
        };
        Returns: Array<{
          total_clicks: number;
          qr_scans: number;
          human_clicks: number;
          unique_clicks: number;
          visitors: number;
          page_views: number;
        }>;
      };
      get_analytics_with_filters: {
        Args: {
          p_event_id: string;
          p_date_from?: string;
          p_date_to?: string;
          p_tracking_types?: string[];
          p_device_types?: string[];
          p_countries?: string[];
        };
        Returns: Array<{
          tracking_type: string;
          device_type?: string;
          country?: string;
          click_count: number;
          unique_visitors: number;
          date_group: string;
        }>;
      };
    };
  };
}
