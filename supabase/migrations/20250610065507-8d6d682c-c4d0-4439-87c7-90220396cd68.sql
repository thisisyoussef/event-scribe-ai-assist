
-- Create teams table for contact management
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  roles text[] DEFAULT '{}', -- Array of role strings like ['Coordinator', 'Setup', 'Marketing']
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create locations table
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  address text NOT NULL,
  map_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sponsors table
CREATE TABLE public.sponsors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_name text NOT NULL,
  contact_person text NOT NULL,
  contact_phone text,
  contact_email text,
  sponsorship_level text DEFAULT 'Bronze', -- Bronze, Silver, Gold, Platinum
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create itineraries table
CREATE TABLE public.itineraries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  time_slot time without time zone NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create additional_details table
CREATE TABLE public.additional_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  marketing_level text CHECK (marketing_level IN ('low', 'medium', 'high')),
  age_groups text[] DEFAULT '{}',
  tone text CHECK (tone IN ('formal', 'casual', 'fun')),
  attendance_estimate integer DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tasks table for pre-event task management
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid REFERENCES public.teams(id),
  due_date date,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create marketing_ideas table
CREATE TABLE public.marketing_ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  idea_text text NOT NULL,
  effort text CHECK (effort IN ('low', 'medium', 'high')),
  impact text CHECK (impact IN ('low', 'medium', 'high')),
  selected boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create feedback_forms table
CREATE TABLE public.feedback_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text DEFAULT 'scale' CHECK (question_type IN ('scale', 'free_text')),
  question_order integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create feedback_responses table
CREATE TABLE public.feedback_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id uuid REFERENCES public.volunteers(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.feedback_forms(id) ON DELETE CASCADE,
  response_text text,
  rating integer CHECK (rating >= 1 AND rating <= 5), -- For scale questions
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for all new tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for teams table (public for now - adjust based on your auth needs)
CREATE POLICY "Allow all access to teams" ON public.teams FOR ALL USING (true);

-- Create policies for locations table
CREATE POLICY "Allow all access to locations" ON public.locations FOR ALL USING (true);

-- Create policies for sponsors table
CREATE POLICY "Allow all access to sponsors" ON public.sponsors FOR ALL USING (true);

-- Create policies for itineraries table (tied to events)
CREATE POLICY "Allow all access to itineraries" ON public.itineraries FOR ALL USING (true);

-- Create policies for additional_details table
CREATE POLICY "Allow all access to additional_details" ON public.additional_details FOR ALL USING (true);

-- Create policies for tasks table
CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true);

-- Create policies for marketing_ideas table
CREATE POLICY "Allow all access to marketing_ideas" ON public.marketing_ideas FOR ALL USING (true);

-- Create policies for feedback_forms table
CREATE POLICY "Allow all access to feedback_forms" ON public.feedback_forms FOR ALL USING (true);

-- Create policies for feedback_responses table
CREATE POLICY "Allow all access to feedback_responses" ON public.feedback_responses FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_itineraries_event_id ON public.itineraries(event_id);
CREATE INDEX idx_additional_details_event_id ON public.additional_details(event_id);
CREATE INDEX idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_marketing_ideas_event_id ON public.marketing_ideas(event_id);
CREATE INDEX idx_feedback_forms_event_id ON public.feedback_forms(event_id);
CREATE INDEX idx_feedback_responses_volunteer_id ON public.feedback_responses(volunteer_id);
