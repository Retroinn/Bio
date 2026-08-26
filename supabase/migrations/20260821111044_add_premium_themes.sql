/*
# Add premium themes
1. New themes: Cyber, Obsidian, Crimson, Ocean, Violet, Minimal Pro
2. Each has real visual config (background, surface, accent, text)
*/
INSERT INTO public.themes (id, name, config) VALUES
  ('cyber', 'Cyber', '{"background":"#0a0e1a","surface":"#0f1628","accent":"#00f0ff","text":"#e0f7ff"}'),
  ('obsidian', 'Obsidian', '{"background":"#080808","surface":"#121212","accent":"#a855f7","text":"#f5f5f5"}'),
  ('crimson', 'Crimson', '{"background":"#0f0505","surface":"#1a0a0a","accent":"#ff3b5c","text":"#fff0f0"}'),
  ('ocean', 'Ocean', '{"background":"#031420","surface":"#062836","accent":"#00d4ff","text":"#e0f7ff"}'),
  ('violet', 'Violet', '{"background":"#0a0518","surface":"#120830","accent":"#a78bfa","text":"#f5f0ff"}'),
  ('minimal_pro', 'Minimal Pro', '{"background":"#fafafa","surface":"#ffffff","accent":"#000000","text":"#1a1a1a"}')
ON CONFLICT (id) DO NOTHING;
