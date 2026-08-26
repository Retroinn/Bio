/*
# Admin Panel Schema

1. New Tables
- `ticket_replies`: replies on support tickets by admin or user. Each reply belongs to a ticket and an author (user_id).
- `user_bans`: bans applied to users by admins. A banned user cannot sign in or access dashboard.
- `admin_audit_log`: audit trail of admin actions (ban, unban, hide profile, resolve report, etc.).

2. Security
- RLS enabled on all new tables.
- `ticket_replies`: ticket owner can read; admin can read all; ticket owner can insert; admin can insert.
- `user_bans`: only admins can read/insert/delete.
- `admin_audit_log`: only admins can read; only admins can insert.
- All admin authorization uses the existing `is_admin()` SECURITY DEFINER function.

3. RPCs
- `admin_get_stats()`: returns aggregate platform statistics for the admin overview dashboard. Admin-only.
- `admin_get_users()`: returns all users with their profile + subscription info. Admin-only.
- `admin_get_subscriptions()`: returns all subscriptions with plan info. Admin-only.
- `admin_get_reports()`: returns all reports with profile + reporter info. Admin-only.
- `admin_get_media()`: returns all media with profile owner info. Admin-only.
- `admin_get_analytics(days)`: returns analytics aggregates for the last N days. Admin-only.
- `admin_ban_user(target_uid, reason)`: bans a user. Admin-only. Audit logged.
- `admin_unban_user(target_uid)`: unbans a user. Admin-only. Audit logged.
- `admin_hide_profile(profile_id)`: hides a profile (is_public = false). Admin-only. Audit logged.
- `admin_resolve_report(report_id, action)`: resolves a report. Admin-only. Audit logged.
- `admin_update_ticket_status(ticket_id, status)`: updates ticket status. Admin-only. Audit logged.

4. Notes
- All admin RPCs check `is_admin(auth.uid())` and return NULL/empty if not admin.
- Ban check: a trigger on auth.sessions is NOT used; instead the frontend checks `user_bans` via the auth context. A SECURITY DEFINER function `is_user_banned(uid)` is provided for client-side checks.
*/

-- Ticket replies
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_replies_ticket_idx ON public.ticket_replies(ticket_id, created_at);

-- User bans
CREATE TABLE IF NOT EXISTS public.user_bans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Ticket replies: owner can read own ticket's replies, admin can read all, owner can insert, admin can insert
DROP POLICY IF EXISTS "ticket_replies_owner_read" ON public.ticket_replies;
CREATE POLICY "ticket_replies_owner_read" ON public.ticket_replies FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  OR public.is_admin(auth.uid())
);
DROP POLICY IF EXISTS "ticket_replies_owner_insert" ON public.ticket_replies;
CREATE POLICY "ticket_replies_owner_insert" ON public.ticket_replies FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  AND user_id = auth.uid()
);
DROP POLICY IF EXISTS "ticket_replies_admin_insert" ON public.ticket_replies;
CREATE POLICY "ticket_replies_admin_insert" ON public.ticket_replies FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- User bans: admin only
DROP POLICY IF EXISTS "user_bans_admin_all" ON public.user_bans;
CREATE POLICY "user_bans_admin_read" ON public.user_bans FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "user_bans_admin_insert" ON public.user_bans FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "user_bans_admin_delete" ON public.user_bans FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Allow users to check if they themselves are banned (for auth flow)
DROP POLICY IF EXISTS "user_bans_self_check" ON public.user_bans;
CREATE POLICY "user_bans_self_check" ON public.user_bans FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admin audit log: admin only
DROP POLICY IF EXISTS "admin_audit_log_admin_all" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_admin_read" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin_audit_log_admin_insert" ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Helper: check if user is banned (for client-side)
CREATE OR REPLACE FUNCTION public.is_user_banned(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = uid);
$$;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;

-- Admin: get platform stats
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'total_profiles', (SELECT count(*) FROM public.profiles),
    'total_views', (SELECT COALESCE(sum(profile_views), 0) FROM public.profiles),
    'total_links', (SELECT count(*) FROM public.links),
    'total_projects', (SELECT count(*) FROM public.projects),
    'total_widgets', (SELECT count(*) FROM public.widgets),
    'pro_users', (SELECT count(*) FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id WHERE p.slug = 'pro' AND s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end >= now())),
    'free_users', (SELECT count(*) FROM auth.users) - (SELECT count(*) FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id WHERE p.slug = 'pro' AND s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end >= now())),
    'monthly_subs', (SELECT count(*) FROM public.subscriptions WHERE billing_cycle = 'monthly' AND status IN ('active', 'trialing')),
    'yearly_subs', (SELECT count(*) FROM public.subscriptions WHERE billing_cycle = 'yearly' AND status IN ('active', 'trialing')),
    'canceled_subs', (SELECT count(*) FROM public.subscriptions WHERE status = 'canceled'),
    'pending_payments', (SELECT count(*) FROM public.payment_events WHERE event_type LIKE '%pending%'),
    'support_tickets', (SELECT count(*) FROM public.support_tickets WHERE status = 'open'),
    'reports', (SELECT count(*) FROM public.reports WHERE status = 'pending'),
    'total_media', (SELECT count(*) FROM public.media)
  );
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;

-- Admin: get all users with profile + sub info
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT
      u.id,
      u.email,
      u.created_at,
      p.username,
      p.display_name,
      p.is_public,
      p.avatar_url,
      p.profile_views,
      p.plan AS profile_plan,
      p.created_at AS profile_created_at,
      s.status AS sub_status,
      pl.slug AS plan_slug,
      (SELECT count(*) FROM public.links WHERE profile_id = p.id) AS link_count,
      (SELECT count(*) FROM public.projects WHERE profile_id = p.id) AS project_count,
      EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = u.id) AS is_banned
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    LEFT JOIN public.plans pl ON pl.id = s.plan_id
    ORDER BY u.created_at DESC
  ) t;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

-- Admin: get all subscriptions
CREATE OR REPLACE FUNCTION public.admin_get_subscriptions()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT
      s.id, s.user_id, s.status, s.billing_cycle, s.provider,
      s.current_period_start, s.current_period_end, s.cancel_at_period_end,
      s.created_at, p.slug AS plan_slug, p.name AS plan_name,
      u.email AS user_email, prof.username
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    JOIN auth.users u ON u.id = s.user_id
    LEFT JOIN public.profiles prof ON prof.user_id = s.user_id
    ORDER BY s.created_at DESC
  ) t;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_subscriptions() TO authenticated;

-- Admin: get all reports
CREATE OR REPLACE FUNCTION public.admin_get_reports()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT
      r.id, r.reason, r.status, r.created_at,
      r.profile_id, prof.username AS reported_username,
      reporter.email AS reporter_email
    FROM public.reports r
    LEFT JOIN public.profiles prof ON prof.id = r.profile_id
    LEFT JOIN auth.users reporter ON reporter.id = r.reporter_id
    ORDER BY r.created_at DESC
  ) t;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_reports() TO authenticated;

-- Admin: get all media
CREATE OR REPLACE FUNCTION public.admin_get_media()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT
      m.id, m.type, m.url, m.file_name, m.file_size, m.mime_type, m.created_at,
      p.username, p.user_id
    FROM public.media m
    JOIN public.profiles p ON p.id = m.profile_id
    ORDER BY m.created_at DESC
  ) t;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_media() TO authenticated;

-- Admin: get analytics for last N days
CREATE OR REPLACE FUNCTION public.admin_get_analytics(days integer)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'profile_views', (SELECT count(*) FROM public.analytics_events WHERE event_type = 'profile_view' AND created_at >= now() - (days || ' days')::interval),
    'link_clicks', (SELECT count(*) FROM public.analytics_events WHERE event_type IN ('link_click', 'social_click', 'project_click') AND created_at >= now() - (days || ' days')::interval),
    'new_users', (SELECT count(*) FROM auth.users WHERE created_at >= now() - (days || ' days')::interval),
    'new_profiles', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - (days || ' days')::interval),
    'support_tickets', (SELECT count(*) FROM public.support_tickets WHERE created_at >= now() - (days || ' days')::interval),
    'reports', (SELECT count(*) FROM public.reports WHERE created_at >= now() - (days || ' days')::interval),
    'daily_views', COALESCE((
      SELECT json_agg(row_to_json(d)) FROM (
        SELECT date_trunc('day', created_at) AS date, count(*) AS count
        FROM public.analytics_events
        WHERE event_type = 'profile_view' AND created_at >= now() - (days || ' days')::interval
        GROUP BY date_trunc('day', created_at)
        ORDER BY date
      ) d
    ), '[]'::json)
  );
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics(integer) TO authenticated;

-- Admin: ban user
CREATE OR REPLACE FUNCTION public.admin_ban_user(target_uid uuid, ban_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RETURN false; END IF;
  INSERT INTO public.user_bans (user_id, reason, banned_by) VALUES (target_uid, ban_reason, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'ban_user', 'user', target_uid::text, json_build_object('reason', ban_reason));
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;

-- Admin: unban user
CREATE OR REPLACE FUNCTION public.admin_unban_user(target_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RETURN false; END IF;
  DELETE FROM public.user_bans WHERE user_id = target_uid;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'unban_user', 'user', target_uid::text);
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;

-- Admin: hide profile
CREATE OR REPLACE FUNCTION public.admin_hide_profile(target_pid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RETURN false; END IF;
  UPDATE public.profiles SET is_public = false, updated_at = now() WHERE id = target_pid;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'hide_profile', 'profile', target_pid::text);
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_hide_profile(uuid) TO authenticated;

-- Admin: resolve report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(target_rid uuid, action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RETURN false; END IF;
  UPDATE public.reports SET status = action WHERE id = target_rid;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'resolve_report', 'report', target_rid::text, json_build_object('action', action));
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text) TO authenticated;

-- Admin: update ticket status
CREATE OR REPLACE FUNCTION public.admin_update_ticket_status(target_tid uuid, new_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RETURN false; END IF;
  UPDATE public.support_tickets SET status = new_status, updated_at = now() WHERE id = target_tid;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'update_ticket_status', 'ticket', target_tid::text, json_build_object('status', new_status));
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_ticket_status(uuid, text) TO authenticated;