
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

// New Phase 2 interfaces
export interface Team {
  id: string;
  name: string;
  phone: string;
  roles: string[];
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  label: string;
  address: string;
  map_link?: string;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  org_name: string;
  contact_person: string;
  contact_phone?: string;
  contact_email?: string;
  sponsorship_level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  created_at: string;
  updated_at: string;
}

export interface Itinerary {
  id: string;
  event_id: string;
  time_slot: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface AdditionalDetails {
  id: string;
  event_id: string;
  marketing_level?: 'low' | 'medium' | 'high';
  age_groups: string[];
  tone?: 'formal' | 'casual' | 'fun';
  attendance_estimate: number;
  created_at: string;
}

export interface Task {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  due_date?: string;
  status: 'todo' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface MarketingIdea {
  id: string;
  event_id: string;
  idea_text: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  selected: boolean;
  created_at: string;
}

export interface FeedbackForm {
  id: string;
  event_id: string;
  question_text: string;
  question_type: 'scale' | 'free_text';
  question_order: number;
  created_at: string;
}

export interface FeedbackResponse {
  id: string;
  volunteer_id: string;
  question_id: string;
  response_text?: string;
  rating?: number;
  created_at: string;
}
