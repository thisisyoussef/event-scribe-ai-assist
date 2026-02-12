export interface EventTemplate {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface EventTemplateDetails {
  id: string;
  template_id: string;
  title: string;
  description?: string;
  location: string;
  sms_enabled: boolean;
  day_before_time: string;
  day_of_time: string;
  created_at: string;
  updated_at: string;
  // Optional extended properties
  marketing_level?: string;
  tone?: string;
  age_groups?: string[];
  expected_attendance?: number | string;
}

export interface EventTemplateItinerary {
  id: string;
  template_id: string;
  time_slot: string;
  activity: string;
  description?: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface EventTemplateVolunteerRole {
  id: string;
  template_id: string;
  role_label: string;
  shift_start: string;
  shift_end: string;
  slots_brother: number;
  slots_sister: number;
  slots_flexible: number;
  suggested_poc?: string;
  notes?: string;
  created_at: string;
}

export interface EventTemplatePreEventTask {
  id: string;
  template_id: string;
  task_description: string;
  assigned_to?: string;
  due_date_offset_days: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface EventTemplateWithDetails extends EventTemplate {
  details?: EventTemplateDetails;
  itineraries?: EventTemplateItinerary[];
  volunteer_roles?: EventTemplateVolunteerRole[];
  pre_event_tasks?: EventTemplatePreEventTask[];
}

export interface CreateEventTemplateData {
  name: string;
  description?: string;
  is_public: boolean;
  details: Omit<EventTemplateDetails, 'id' | 'template_id' | 'created_at' | 'updated_at'>;
  itineraries: Omit<EventTemplateItinerary, 'id' | 'template_id' | 'created_at' | 'updated_at'>[];
  volunteer_roles: Omit<EventTemplateVolunteerRole, 'id' | 'template_id' | 'created_at'>[];
  pre_event_tasks: Omit<EventTemplatePreEventTask, 'id' | 'template_id' | 'created_at' | 'updated_at'>[];
}
