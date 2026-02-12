-- Remove legacy view that implicitly runs with definer privileges
-- This resolves security scanners flagging SECURITY DEFINER semantics on views

DROP VIEW IF EXISTS public.contacts_with_stats;

