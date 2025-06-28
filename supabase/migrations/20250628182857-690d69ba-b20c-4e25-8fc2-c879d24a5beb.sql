
-- Enable RLS on events table if not already enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

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

-- Update volunteer backup policies to restrict access to admin@miumma.org
DROP POLICY IF EXISTS "Users can view volunteer backup for their events" ON public.volunteers_backup;

CREATE POLICY "Admin can view all volunteer backup data" 
  ON public.volunteers_backup 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@miumma.org'
    )
  );
