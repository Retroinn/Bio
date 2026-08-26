/*
# Create B.io core profile platform

1. New tables
- `profiles`: one public identity page per signed-in user, with profile copy, visibility controls, appearance, and SEO metadata.
- `links`: ordered custom links owned through a profile.
- `social_links`: ordered social accounts owned through a profile.
- `projects`: portfolio cards owned through a profile.
- `widgets`: extensible public widgets with JSON configuration.
- `analytics_events`: privacy-friendly profile, link, social, and project events without raw IP storage.
- `reserved_usernames`: protected platform usernames.
- `themes`: reusable appearance presets.

2. Security
- Row-level security is enabled on all tables.
- Signed-in users can only manage rows tied to their own profile.
- Anonymous visitors can only read profiles marked public and their active public content.
- Analytics events can be inserted for public profiles but cannot be read or changed by anonymous visitors.

3. Notes
- Ownership is derived from `auth.uid()` by default to prevent client-side ownership spoofing.
- Child records use profile ownership checks so users cannot reach another profile by changing an ID.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text,
  banner_url text,
  location text,
  website text,
  status_text text,
  is_public boolean NOT NULL DEFAULT true,
  show_location boolean NOT NULL DEFAULT true,
  show_discord boolean NOT NULL DEFAULT true,
  show_activity boolean NOT NULL DEFAULT true,
  show_socials boolean NOT NULL DEFAULT true,
  show_projects boolean NOT NULL DEFAULT true,
  show_music boolean NOT NULL DEFAULT true,
  show_media boolean NOT NULL DEFAULT true,
  theme_id text NOT NULL DEFAULT 'dark',
  layout_id text NOT NULL DEFAULT 'classic',
  profile_views bigint NOT NULL DEFAULT 0,
  seo_title text,
  seo_description text,
  seo_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '',
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'link',
  thumbnail_url text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  username text NOT NULL DEFAULT '',
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'link',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  project_url text,
  github_url text,
  technologies text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.links(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  device text,
  country text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  username text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.themes (
  id text PRIMARY KEY,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.reserved_usernames (username) VALUES
  ('admin'), ('api'), ('login'), ('register'), ('dashboard'), ('settings'), ('support'), ('help'), ('pricing'), ('privacy'), ('terms'), ('about'), ('explore'), ('features'), ('contact')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.themes (id, name, config) VALUES
  ('dark', 'Dark', '{"background":"#080808","surface":"#111111","accent":"#b9ff3d","text":"#f5f5f0"}'),
  ('midnight', 'Midnight', '{"background":"#07111f","surface":"#0e1b2e","accent":"#7dd3fc","text":"#f8fafc"}'),
  ('glass', 'Glass', '{"background":"#111214","surface":"rgba(255,255,255,0.08)","accent":"#e7e7e7","text":"#ffffff"}')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS links_profile_position_idx ON public.links(profile_id, position);
CREATE INDEX IF NOT EXISTS socials_profile_position_idx ON public.social_links(profile_id, position);
CREATE INDEX IF NOT EXISTS projects_profile_position_idx ON public.projects(profile_id, position);
CREATE INDEX IF NOT EXISTS widgets_profile_position_idx ON public.widgets(profile_id, position);
CREATE INDEX IF NOT EXISTS analytics_profile_created_idx ON public.analytics_events(profile_id, created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT TO anon, authenticated USING (is_public OR auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "links_public_read" ON public.links;
CREATE POLICY "links_public_read" ON public.links FOR SELECT TO anon, authenticated USING (is_active AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_public) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "links_insert_own" ON public.links;
CREATE POLICY "links_insert_own" ON public.links FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "links_update_own" ON public.links;
CREATE POLICY "links_update_own" ON public.links FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "links_delete_own" ON public.links;
CREATE POLICY "links_delete_own" ON public.links FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "socials_public_read" ON public.social_links;
CREATE POLICY "socials_public_read" ON public.social_links FOR SELECT TO anon, authenticated USING (is_active AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_public AND p.show_socials) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "socials_insert_own" ON public.social_links;
CREATE POLICY "socials_insert_own" ON public.social_links FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "socials_update_own" ON public.social_links;
CREATE POLICY "socials_update_own" ON public.social_links FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "socials_delete_own" ON public.social_links;
CREATE POLICY "socials_delete_own" ON public.social_links FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "projects_public_read" ON public.projects;
CREATE POLICY "projects_public_read" ON public.projects FOR SELECT TO anon, authenticated USING ((is_visible AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_public AND p.show_projects)) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "widgets_public_read" ON public.widgets;
CREATE POLICY "widgets_public_read" ON public.widgets FOR SELECT TO anon, authenticated USING ((is_visible AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_public)) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "widgets_insert_own" ON public.widgets;
CREATE POLICY "widgets_insert_own" ON public.widgets FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "widgets_update_own" ON public.widgets;
CREATE POLICY "widgets_update_own" ON public.widgets FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "widgets_delete_own" ON public.widgets;
CREATE POLICY "widgets_delete_own" ON public.widgets FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "analytics_insert_public" ON public.analytics_events;
CREATE POLICY "analytics_insert_public" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.is_public));
DROP POLICY IF EXISTS "analytics_select_own" ON public.analytics_events;
CREATE POLICY "analytics_select_own" ON public.analytics_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "reserved_read" ON public.reserved_usernames;
CREATE POLICY "reserved_read" ON public.reserved_usernames FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "themes_read" ON public.themes;
CREATE POLICY "themes_read" ON public.themes FOR SELECT TO anon, authenticated USING (true);
