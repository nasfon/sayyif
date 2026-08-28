-- ============================================================================
-- IMS — Fix admin functions' search_path for pgcrypto (MVP bugfix)
--
-- `admin_create_user` and `admin_reset_password` hash passwords with
-- pgcrypto's crypt()/gen_salt(). On Supabase those functions live in the
-- `extensions` schema, but the SECURITY DEFINER functions were declared with
-- `set search_path = public`, so the hash calls failed with
-- `function gen_salt(unknown, integer) does not exist` (SQLSTATE 42883) and
-- user creation showed a generic error.
--
-- This ALTERs the configuration of the already-created functions. Fresh
-- databases get the fixed search_path directly from migration 0003.
-- ============================================================================

alter function public.admin_create_user(text, text, text, text, text, uuid)
  set search_path = public, extensions;

alter function public.admin_reset_password(uuid, text)
  set search_path = public, extensions;