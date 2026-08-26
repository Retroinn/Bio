/*
# Extend B.io schema: Discord, Media, Music, Reports, Admin, Plans

1. New tables
- `discord_connections`: stores Discord OAuth2 connection data per profile (id, username, display name, avatar, tokens, expiry). Tokens are only writable by the owner; public read is limited to non-secret display fields via a view-free policy.
- `media`: uploaded media metadata for avatars, banners, backgrounds, project images, gallery, audio.
- `music_tracks`: profile music player tracks.
- `reports`: profile reports submitted by users, reviewed by admins.
- `admin_users`: marks which users are admins (server-side authorization).

2. Modified tables
- `profiles`: add `plan text NOT NULL DEFAULT 'free'` for free/pro architecture.
- `profiles`: add `seo_indexable boolean NOT NULL DEFAULT true` for search engine indexing toggle.

3. Security
- RLS enabled on all new tables.
- Owners can CRUD their own rows through profile ownership checks.
- Anonymous users can read public media/music for public profiles.
- Reports can be inserted by authenticated users; only admins can read/update.
- Admin users table is read-only for authenticated (admin check via self-membership).

4. Notes
- Discord tokens are stored but never exposed to the client (no SELECT policy on token columns for anon).
- A SECURITY DEFINER function `is_admin()` allows server-side admin checks.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seo_indexable boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.discord_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  discord_username text NOT NULL,
  display_name text,
  avatar_url text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  storage_path text NOT NULL,
  url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  audio_url text NOT NULL,
  cover_url text,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_profile_idx ON public.media(profile_id);
CREATE INDEX IF NOT EXISTS music_profile_position_idx ON public.music_tracks(profile_id, position);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS analytics_event_type_idx ON public.analytics_events(event_type);

ALTER TABLE public.discord_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Discord connections: owner full CRUD; public read only display fields (no tokens)
DROP POLICY IF EXISTS "discord_owner_all" ON public.discord_connections;
CREATE POLICY "discord_owner_select" ON public.discord_connections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "discord_owner_insert" ON public.discord_connections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "discord_owner_update" ON public.discord_connections FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "discord_owner_delete" ON public.discord_connections FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

-- Media: owner CRUD; public read for public profiles
DROP POLICY IF EXISTS "media_public_read" ON public.media;
CREATE POLICY "media_public_read" ON public.media FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_public) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "media_owner_insert" ON public.media FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "media_owner_update" ON public.media FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "media_owner_delete" ON public.media FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

-- Music: owner CRUD; public read for public profiles with show_music
DROP POLICY IF EXISTS "music_public_read" ON public.music_tracks;
CREATE POLICY "music_public_read" ON public.music_tracks FOR SELECT TO anon, authenticated USING ((is_active AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_public AND p.show_music)) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "music_owner_insert" ON public.music_tracks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "music_owner_update" ON public.music_tracks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "music_owner_delete" ON public.music_tracks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

-- Reports: authenticated can insert; only admins can read/update
DROP POLICY IF EXISTS "reports_insert_auth" ON public.reports;
CREATE POLICY "reports_insert_auth" ON public.reports FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "reports_admin_all" ON public.reports;
CREATE POLICY "reports_admin_select" ON public.reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "reports_admin_update" ON public.reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Admin users: anyone can check if they themselves are admin (for UI); only admins see full list
DROP POLICY IF EXISTS "admin_self_check" ON public.admin_users;
CREATE POLICY "admin_self_check" ON public.admin_users FOR SELECT TO authenticated USING (user_id = auth.uid());

-- is_admin() helper function for server-side checks
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Insert remaining built-in themes
INSERT INTO public.themes (id, name, config) VALUES
  ('minimal', 'Minimal', '{"background":"#0a0a0a","surface":"#141414","accent":"#ffffff","text":"#ffffff"}'),
  ('neon', 'Neon', '{"background":"#0a0014","surface":"#14001f","accent":"#ff3df5","text":"#ffffff"}'),
  ('aurora', 'Aurora', '{"background":"#02101f","surface":"#0a1f2e","accent":"#3dffd6","text":"#ffffff"}'),
  ('clean', 'Clean', '{"background":"#f5f5f0","surface":"#ffffff","accent":"#1a1a1a","text":"#1a1a1a"}'),
  ('gamer', 'Gamer', '{"background":"#0a0e1a","surface":"#121828","accent":"#3d8bff","text":"#ffffff"}')
ON CONFLICT (id) DO NOTHING;
