import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  EventTemplate, 
  EventTemplateWithDetails, 
  CreateEventTemplateData 
} from '@/types/eventTemplates';

export const useEventTemplates = () => {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('useEventTemplates: Got user:', user ? { id: user.id, email: user.email } : null);
      setCurrentUser(user);
    };
    getUser();
  }, []);

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .or(`user_id.eq.${currentUser.id},is_public.eq.true`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Load template with full details
  const loadTemplateDetails = useCallback(async (templateId: string): Promise<EventTemplateWithDetails | null> => {
    try {
      // Get template details
      const { data: details, error: detailsError } = await supabase
        .from('event_template_details')
        .select('*')
        .eq('template_id', templateId)
        .single();

      if (detailsError && detailsError.code !== 'PGRST116') throw detailsError;

      // Get itineraries
      const { data: itineraries, error: itinerariesError } = await supabase
        .from('event_template_itineraries')
        .select('*')
        .eq('template_id', templateId)
        .order('time_slot');

      if (itinerariesError) throw itinerariesError;

      // Get volunteer roles
      const { data: volunteerRoles, error: volunteerRolesError } = await supabase
        .from('event_template_volunteer_roles')
        .select('*')
        .eq('template_id', templateId);

      if (volunteerRolesError) throw volunteerRolesError;

      // Get pre-event tasks
      const { data: preEventTasks, error: preEventTasksError } = await supabase
        .from('event_template_pre_event_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('due_date_offset_days', { ascending: false });

      if (preEventTasksError) throw preEventTasksError;

      // Get base template
      const { data: template, error: templateError } = await supabase
        .from('event_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      return {
        ...template,
        details: details || undefined,
        itineraries: itineraries || [],
        volunteer_roles: volunteerRoles || [],
        pre_event_tasks: preEventTasks || []
      };
    } catch (error) {
      console.error('Error loading template details:', error);
      toast({
        title: "Error",
        description: "Failed to load template details.",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  // Create new template
  const createTemplate = useCallback(async (templateData: CreateEventTemplateData): Promise<string | null> => {
    if (!currentUser) return null;

    try {
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('event_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          user_id: currentUser.id,
          is_public: templateData.is_public
        })
        .select()
        .single();

      if (templateError) throw templateError;

      const templateId = template.id;

      // Create template details
      if (templateData.details) {
        const { error: detailsError } = await supabase
          .from('event_template_details')
          .insert({
            ...templateData.details,
            template_id: templateId
          });

        if (detailsError) throw detailsError;
      }

      // Create itineraries
      if (templateData.itineraries.length > 0) {
        const { error: itinerariesError } = await supabase
          .from('event_template_itineraries')
          .insert(
            templateData.itineraries.map(item => ({
              ...item,
              template_id: templateId
            }))
          );

        if (itinerariesError) throw itinerariesError;
      }

      // Create volunteer roles
      if (templateData.volunteer_roles.length > 0) {
        const { error: volunteerRolesError } = await supabase
          .from('event_template_volunteer_roles')
          .insert(
            templateData.volunteer_roles.map(item => ({
              ...item,
              template_id: templateId
            }))
          );

        if (volunteerRolesError) throw volunteerRolesError;
      }

      // Create pre-event tasks
      if (templateData.pre_event_tasks.length > 0) {
        const { error: preEventTasksError } = await supabase
          .from('event_template_pre_event_tasks')
          .insert(
            templateData.pre_event_tasks.map(item => ({
              ...item,
              template_id: templateId
            }))
          );

        if (preEventTasksError) throw preEventTasksError;
      }

      toast({
        title: "Success",
        description: "Template created successfully.",
      });

      // Reload templates
      await loadTemplates();
      return templateId;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentUser, loadTemplates]);

  // Update template
  const updateTemplate = useCallback(async (templateId: string, templateData: CreateEventTemplateData): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Update template base info
      const { error: templateError } = await supabase
        .from('event_templates')
        .update({
          name: templateData.name,
          description: templateData.description,
          is_public: templateData.is_public
        })
        .eq('id', templateId);

      if (templateError) {
        console.error('Template update error:', templateError);
        throw templateError;
      }

      // Delete existing related data to replace with new data
      await supabase.from('event_template_details').delete().eq('template_id', templateId);
      await supabase.from('event_template_itineraries').delete().eq('template_id', templateId);
      await supabase.from('event_template_volunteer_roles').delete().eq('template_id', templateId);
      await supabase.from('event_template_pre_event_tasks').delete().eq('template_id', templateId);

      // Create template details
      if (templateData.details) {
        const { error: detailsError } = await supabase
          .from('event_template_details')
          .insert({
            ...templateData.details,
            template_id: templateId
          });

        if (detailsError) throw detailsError;
      }

      // Create itineraries
      if (templateData.itineraries.length > 0) {
        const { error: itinerariesError } = await supabase
          .from('event_template_itineraries')
          .insert(
            templateData.itineraries.map(item => ({
              ...item,
              template_id: templateId
            }))
          );

        if (itinerariesError) throw itinerariesError;
      }

      // Create volunteer roles
      if (templateData.volunteer_roles.length > 0) {
        const { error: volunteerRolesError } = await supabase
          .from('event_template_volunteer_roles')
          .insert(
            templateData.volunteer_roles.map(item => ({
              ...item,
              template_id: templateId
            }))
          );

        if (volunteerRolesError) throw volunteerRolesError;
      }

      // Create pre-event tasks
      if (templateData.pre_event_tasks.length > 0) {
        const { error: preEventTasksError } = await supabase
          .from('event_template_pre_event_tasks')
          .insert(
            templateData.pre_event_tasks.map(item => ({
              ...item,
              template_id: templateId
            }))
          );

        if (preEventTasksError) throw preEventTasksError;
      }

      toast({
        title: "Success",
        description: "Template updated successfully.",
      });

      // Reload templates
      await loadTemplates();
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template.",
        variant: "destructive",
      });
      return false;
    }
  }, [currentUser, loadTemplates]);

  // Delete template
  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('event_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully.",
      });

      // Reload templates
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    }
  }, [loadTemplates]);

  // Load deleted templates for recovery
  const loadDeletedTemplates = useCallback(async (): Promise<EventTemplate[]> => {
    if (!currentUser) return [];
    
    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .eq('user_id', currentUser.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading deleted templates:', error);
      toast({
        title: "Error",
        description: "Failed to load deleted templates.",
        variant: "destructive",
      });
      return [];
    }
  }, [currentUser]);

  // Soft delete template
  const softDeleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      
      
      const { error } = await supabase.rpc('soft_delete_event_template', {
        template_id: templateId,
        user_uuid: currentUser.id
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Template moved to recently deleted.",
      });

      // Reload templates
      await loadTemplates();
      return true;
    } catch (error) {
      console.error('Error soft deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to move template to recently deleted.",
        variant: "destructive",
      });
      return false;
    }
  }, [currentUser, loadTemplates]);

  // Restore template
  const restoreTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase.rpc('restore_event_template', {
        template_id: templateId,
        user_uuid: currentUser.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template restored successfully.",
      });

      // Reload templates
      await loadTemplates();
      return true;
    } catch (error) {
      console.error('Error restoring template:', error);
      toast({
        title: "Error",
        description: "Failed to restore template.",
        variant: "destructive",
      });
      return false;
    }
  }, [currentUser, loadTemplates]);

  // Permanently delete template
  const permanentlyDeleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('event_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template permanently deleted.",
      });

      return true;
    } catch (error) {
      console.error('Error permanently deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to permanently delete template.",
        variant: "destructive",
      });
      return false;
    }
  }, []);



  // Load templates when user changes
  useEffect(() => {
    if (currentUser) {
      loadTemplates();
    }
  }, [currentUser, loadTemplates]);

  return {
    templates,
    isLoading,
    loadTemplates,
    loadTemplateDetails,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    softDeleteTemplate,
    restoreTemplate,
    permanentlyDeleteTemplate,
    loadDeletedTemplates,
    currentUser
  };
};
