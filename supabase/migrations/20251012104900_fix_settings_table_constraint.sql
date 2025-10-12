-- Fix: Drop the overly restrictive UNIQUE(key) constraint on the settings table.
-- This constraint prevents multiple users (multiple browserIds) from saving their own separate settings.
-- The correct constraint (settings_user_id_key_key) ensuring multi-tenancy is already in place.

alter table public.settings
drop constraint if exists settings_key_key;