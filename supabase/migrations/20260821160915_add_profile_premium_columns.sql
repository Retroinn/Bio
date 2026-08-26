/*
# Add premium feature columns to profiles
- custom_css: Pro custom CSS editor
- remove_branding: hide B.io branding (Pro)
- show_pro_badge: show PRO badge on public profile (Pro)
- custom_font: custom font family (Pro)
- background_type: none | color | gradient | image | video
- background_config: JSON config for background (url, opacity, blur, overlay, etc.)
- accent_color: custom accent color override
*/
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_css text DEFAULT '',
  ADD COLUMN IF NOT EXISTS remove_branding boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_pro_badge boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_font text DEFAULT '',
  ADD COLUMN IF NOT EXISTS background_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS background_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '';
