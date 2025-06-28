
-- Create a backup table to track all volunteer changes
CREATE TABLE public.volunteers_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_volunteer_id uuid NOT NULL,
  event_id uuid,
  role_id uuid,
  name text NOT NULL,
  phone text NOT NULL,
  gender text NOT NULL,
  notes text,
  status text,
  signup_date timestamp with time zone,
  operation_type text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  operation_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  changed_by uuid, -- references auth.users if available
  old_data jsonb, -- stores the old row data for updates/deletes
  new_data jsonb, -- stores the new row data for inserts/updates
  PRIMARY KEY (id)
);

-- Add indexes for better query performance
CREATE INDEX idx_volunteers_backup_original_id ON public.volunteers_backup(original_volunteer_id);
CREATE INDEX idx_volunteers_backup_event_id ON public.volunteers_backup(event_id);
CREATE INDEX idx_volunteers_backup_operation_timestamp ON public.volunteers_backup(operation_timestamp);
CREATE INDEX idx_volunteers_backup_operation_type ON public.volunteers_backup(operation_type);

-- Enable RLS on the backup table
ALTER TABLE public.volunteers_backup ENABLE ROW LEVEL SECURITY;

-- Create policy to allow event owners to view backup data for their events
CREATE POLICY "Users can view volunteer backup for their events" 
  ON public.volunteers_backup 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = volunteers_backup.event_id 
    AND events.created_by = auth.uid()
  ));

-- Create a function to log volunteer changes
CREATE OR REPLACE FUNCTION public.log_volunteer_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.volunteers_backup (
      original_volunteer_id,
      event_id,
      role_id,
      name,
      phone,
      gender,
      notes,
      status,
      signup_date,
      operation_type,
      changed_by,
      new_data
    ) VALUES (
      NEW.id,
      NEW.event_id,
      NEW.role_id,
      NEW.name,
      NEW.phone,
      NEW.gender,
      NEW.notes,
      NEW.status,
      NEW.signup_date,
      'INSERT',
      auth.uid(),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.volunteers_backup (
      original_volunteer_id,
      event_id,
      role_id,
      name,
      phone,
      gender,
      notes,
      status,
      signup_date,
      operation_type,
      changed_by,
      old_data,
      new_data
    ) VALUES (
      NEW.id,
      NEW.event_id,
      NEW.role_id,
      NEW.name,
      NEW.phone,
      NEW.gender,
      NEW.notes,
      NEW.status,
      NEW.signup_date,
      'UPDATE',
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.volunteers_backup (
      original_volunteer_id,
      event_id,
      role_id,
      name,
      phone,
      gender,
      notes,
      status,
      signup_date,
      operation_type,
      changed_by,
      old_data
    ) VALUES (
      OLD.id,
      OLD.event_id,
      OLD.role_id,
      OLD.name,
      OLD.phone,
      OLD.gender,
      OLD.notes,
      OLD.status,
      OLD.signup_date,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create triggers to automatically log all volunteer changes
CREATE TRIGGER volunteers_backup_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.volunteers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_volunteer_changes();

-- Create a view for easy querying of recent volunteer activity
CREATE OR REPLACE VIEW public.volunteer_activity_log AS
SELECT 
  vb.id as backup_id,
  vb.original_volunteer_id,
  vb.name,
  vb.phone,
  vb.operation_type,
  vb.operation_timestamp,
  e.title as event_title,
  vr.role_label,
  vb.old_data,
  vb.new_data
FROM public.volunteers_backup vb
LEFT JOIN public.events e ON vb.event_id = e.id
LEFT JOIN public.volunteer_roles vr ON vb.role_id = vr.id
ORDER BY vb.operation_timestamp DESC;
