
-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view only their own events
CREATE POLICY "Users can view their own events" 
  ON public.events 
  FOR SELECT 
  USING (auth.uid() = created_by);

-- Create policy for users to insert their own events
CREATE POLICY "Users can create their own events" 
  ON public.events 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Create policy for users to update their own events
CREATE POLICY "Users can update their own events" 
  ON public.events 
  FOR UPDATE 
  USING (auth.uid() = created_by);

-- Create policy for users to delete their own events
CREATE POLICY "Users can delete their own events" 
  ON public.events 
  FOR DELETE 
  USING (auth.uid() = created_by);

-- Enable RLS on volunteer_roles table
ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for volunteer_roles (users can manage roles for their own events)
CREATE POLICY "Users can view volunteer roles for their events" 
  ON public.volunteer_roles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteer_roles.event_id 
    AND events.created_by = auth.uid()
  ));

CREATE POLICY "Users can create volunteer roles for their events" 
  ON public.volunteer_roles 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteer_roles.event_id 
    AND events.created_by = auth.uid()
  ));

CREATE POLICY "Users can update volunteer roles for their events" 
  ON public.volunteer_roles 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteer_roles.event_id 
    AND events.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete volunteer roles for their events" 
  ON public.volunteer_roles 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteer_roles.event_id 
    AND events.created_by = auth.uid()
  ));

-- Enable RLS on volunteers table
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

-- Create policies for volunteers (users can view volunteers for their events, but volunteers can also view/update their own records)
CREATE POLICY "Users can view volunteers for their events" 
  ON public.volunteers 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteers.event_id 
    AND events.created_by = auth.uid()
  ));

CREATE POLICY "Anyone can sign up as volunteer for published events" 
  ON public.volunteers 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteers.event_id 
    AND events.status = 'published'
  ));

CREATE POLICY "Users can update volunteers for their events" 
  ON public.volunteers 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteers.event_id 
    AND events.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete volunteers for their events" 
  ON public.volunteers 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteers.event_id 
    AND events.created_by = auth.uid()
  ));
