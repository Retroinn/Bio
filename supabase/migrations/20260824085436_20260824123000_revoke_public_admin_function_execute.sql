/*
# Restrict administrative function execution

1. Purpose
- Prevent unauthenticated clients from invoking SECURITY DEFINER administrative functions.

2. Security changes
- Revokes the default PUBLIC and explicit anon EXECUTE grants from admin RPCs and authorization helpers.
- Keeps EXECUTE available to authenticated users; each admin mutation also checks is_admin(auth.uid()).

3. Data safety
- No tables, rows, columns, or user data are changed.
*/
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_analytics(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_media() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_reports() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_subscriptions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_hide_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_unban_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_ticket_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_media() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hide_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_ticket_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;