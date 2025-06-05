
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
