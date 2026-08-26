/*
# Premium system: plans, subscriptions, features, custom domains, payments, support

1. New tables
- `plans`: Free and Pro plans with monthly/yearly prices stored in DB (not hard-coded).
- `subscriptions`: tracks each user's active/canceled subscription, billing cycle, provider, period dates.
- `subscription_features`: per-plan feature flags with optional numeric limits.
- `custom_domains`: custom domain verification system for Pro users.
- `payment_events`: idempotent log of verified webhook events from payment providers.
- `invoices`: simple invoice records linked to subscriptions.
- `support_tickets`: basic support ticket system for Pro priority support.

2. Security
- RLS enabled on all new tables.
- Users can read their own subscription, features for their plan, and manage their own custom domains / tickets.
- `payment_events` and `invoices` are owner-readable; inserts are server-side only (via service role / edge function).
- A SECURITY DEFINER RPC `check_feature(feature_key, user_uid)` provides server-side entitlement checks.
- A SECURITY DEFINER RPC `get_plan_limits(plan_slug)` returns all feature limits for a plan.

3. Notes
- Provider field supports `stripe`, `iyzico`, and `manual` — no provider-specific assumptions in schema.
- `payment_events.event_id` is unique to prevent duplicate webhook processing.
- Downgrading never deletes data: limits are enforced at insert time via the check_feature RPC, not by deleting rows.
*/

-- Plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_monthly integer NOT NULL DEFAULT 0,
  price_yearly integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  provider text NOT NULL DEFAULT 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscription features (per-plan feature flags + limits)
CREATE TABLE IF NOT EXISTS public.subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  limit_value integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

-- Custom domains
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  verification_token text NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payment events (idempotent webhook log)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  provider_invoice_id text,
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscription_features_plan_idx ON public.subscription_features(plan_id);
CREATE INDEX IF NOT EXISTS custom_domains_profile_idx ON public.custom_domains(profile_id);
CREATE INDEX IF NOT EXISTS payment_events_event_idx ON public.payment_events(event_id);
CREATE INDEX IF NOT EXISTS invoices_sub_idx ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets(user_id);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Plans: public read
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);

-- Subscription features: public read (so frontend can show what each plan includes)
DROP POLICY IF EXISTS "sub_features_public_read" ON public.subscription_features;
CREATE POLICY "sub_features_public_read" ON public.subscription_features FOR SELECT TO anon, authenticated USING (true);

-- Subscriptions: owner read + update; insert via service role only
DROP POLICY IF EXISTS "subs_owner_read" ON public.subscriptions;
CREATE POLICY "subs_owner_read" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "subs_owner_update" ON public.subscriptions;
CREATE POLICY "subs_owner_update" ON public.subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Custom domains: owner CRUD
DROP POLICY IF EXISTS "domains_owner_read" ON public.custom_domains;
CREATE POLICY "domains_owner_read" ON public.custom_domains FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "domains_owner_insert" ON public.custom_domains;
CREATE POLICY "domains_owner_insert" ON public.custom_domains FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "domains_owner_update" ON public.custom_domains;
CREATE POLICY "domains_owner_update" ON public.custom_domains FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "domains_owner_delete" ON public.custom_domains;
CREATE POLICY "domains_owner_delete" ON public.custom_domains FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

-- Payment events: owner read only (inserts via service role)
DROP POLICY IF EXISTS "pay_events_owner_read" ON public.payment_events;
CREATE POLICY "pay_events_owner_read" ON public.payment_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Invoices: owner read only
DROP POLICY IF EXISTS "invoices_owner_read" ON public.invoices;
CREATE POLICY "invoices_owner_read" ON public.invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()));

-- Support tickets: owner CRUD
DROP POLICY IF EXISTS "tickets_owner_all" ON public.support_tickets;
CREATE POLICY "tickets_owner_select" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tickets_owner_insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_owner_update" ON public.support_tickets FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Seed plans
INSERT INTO public.plans (slug, name, price_monthly, price_yearly, currency, is_active, sort_order) VALUES
  ('free', 'Free', 0, 0, 'TRY', true, 0),
  ('pro', 'Pro', 4900, 49000, 'TRY', true, 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Seed subscription features
-- Free plan features
INSERT INTO public.subscription_features (plan_id, feature_key, enabled, limit_value)
SELECT p.id, f.key, f.enabled, f.limit_val FROM public.plans p
CROSS JOIN (VALUES
  ('basic_profile', true, NULL::integer),
  ('basic_avatar', true, NULL),
  ('basic_bio', true, NULL),
  ('social_links', true, 20),
  ('custom_links', true, 10),
  ('basic_themes', true, NULL),
  ('basic_layouts', true, NULL),
  ('projects', true, 3),
  ('basic_analytics', true, NULL),
  ('analytics_history', true, 7),
  ('discord_connection', true, NULL),
  ('qr_code', true, NULL),
  ('media_storage', true, 50),
  ('widgets', true, 3),
  ('music_player', true, 1),
  ('basic_seo', true, NULL),
  ('remove_branding', false, NULL),
  ('custom_domain', false, NULL),
  ('advanced_themes', false, NULL),
  ('premium_layouts', false, NULL),
  ('custom_fonts', false, NULL),
  ('custom_css', false, NULL),
  ('advanced_backgrounds', false, NULL),
  ('video_background', false, NULL),
  ('advanced_effects', false, NULL),
  ('custom_cursor', false, NULL),
  ('link_thumbnails', false, NULL),
  ('scheduled_links', false, NULL),
  ('advanced_widgets', false, NULL),
  ('advanced_analytics', false, NULL),
  ('analytics_export', false, NULL),
  ('custom_og_image', false, NULL),
  ('custom_favicon', false, NULL),
  ('pro_badge', false, NULL),
  ('profile_templates', false, NULL),
  ('priority_support', false, NULL)
) AS f(key, enabled, limit_val)
WHERE p.slug = 'free'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled, limit_value = EXCLUDED.limit_value;

-- Pro plan features
INSERT INTO public.subscription_features (plan_id, feature_key, enabled, limit_value)
SELECT p.id, f.key, f.enabled, f.limit_val FROM public.plans p
CROSS JOIN (VALUES
  ('basic_profile', true, NULL::integer),
  ('basic_avatar', true, NULL),
  ('basic_bio', true, NULL),
  ('social_links', true, NULL),
  ('custom_links', true, NULL),
  ('basic_themes', true, NULL),
  ('basic_layouts', true, NULL),
  ('projects', true, NULL),
  ('basic_analytics', true, NULL),
  ('analytics_history', true, 365),
  ('discord_connection', true, NULL),
  ('qr_code', true, NULL),
  ('media_storage', true, 1024),
  ('widgets', true, NULL),
  ('music_player', true, NULL),
  ('basic_seo', true, NULL),
  ('remove_branding', true, NULL),
  ('custom_domain', true, NULL),
  ('advanced_themes', true, NULL),
  ('premium_layouts', true, NULL),
  ('custom_fonts', true, NULL),
  ('custom_css', true, NULL),
  ('advanced_backgrounds', true, NULL),
  ('video_background', true, NULL),
  ('advanced_effects', true, NULL),
  ('custom_cursor', true, NULL),
  ('link_thumbnails', true, NULL),
  ('scheduled_links', true, NULL),
  ('advanced_widgets', true, NULL),
  ('advanced_analytics', true, NULL),
  ('analytics_export', true, NULL),
  ('custom_og_image', true, NULL),
  ('custom_favicon', true, NULL),
  ('pro_badge', true, NULL),
  ('profile_templates', true, NULL),
  ('priority_support', true, NULL)
) AS f(key, enabled, limit_val)
WHERE p.slug = 'pro'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled, limit_value = EXCLUDED.limit_value;

-- check_feature(feature_key, user_uid) -> returns json with enabled, limit_value, plan_slug
CREATE OR REPLACE FUNCTION public.check_feature(feature_key text, user_uid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      sf.feature_key,
      sf.enabled,
      sf.limit_value,
      p.slug AS plan_slug
    FROM public.subscription_features sf
    JOIN public.plans p ON p.id = sf.plan_id
    WHERE sf.feature_key = $1
      AND p.slug = COALESCE(
        (SELECT pl.slug FROM public.subscriptions s
         JOIN public.plans pl ON pl.id = s.plan_id
         WHERE s.user_id = $2
           AND s.status IN ('active', 'trialing')
           AND (s.current_period_end IS NULL OR s.current_period_end >= now())
        ),
        'free'
      )
    LIMIT 1
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.check_feature(text, uuid) TO authenticated;

-- get_plan_limits(plan_slug) -> returns all features for a plan
CREATE OR REPLACE FUNCTION public.get_plan_limits(plan_slug text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT sf.feature_key, sf.enabled, sf.limit_value
    FROM public.subscription_features sf
    JOIN public.plans p ON p.id = sf.plan_id
    WHERE p.slug = $1
    ORDER BY sf.feature_key
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_limits(text) TO anon, authenticated;

-- check_plan_active(user_uid) -> returns the active plan slug or 'free'
CREATE OR REPLACE FUNCTION public.check_plan_active(user_uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pl.slug FROM public.subscriptions s
     JOIN public.plans pl ON pl.id = s.plan_id
     WHERE s.user_id = $1
       AND s.status IN ('active', 'trialing')
       AND (s.current_period_end IS NULL OR s.current_period_end >= now())
     LIMIT 1),
    'free'
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_plan_active(uuid) TO authenticated;
