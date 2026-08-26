import { useEffect, useState } from 'react';
import { Check, Code, Globe, Lock, Palette, Type } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { Spinner, Toggle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlements';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@/lib/profile-service';
import { UpgradeModal } from '@/components/UpgradeModal';
import type { Theme } from '@/lib/types';

const FREE_LAYOUTS = [
  { id: 'classic', name: 'Classic', desc: 'Ortalanmış kart düzeni', pro: false },
  { id: 'modern', name: 'Modern', desc: 'Yatay başlık + içerik', pro: false },
  { id: 'minimal', name: 'Minimal', desc: 'Sadece metin ve bağlantılar', pro: false },
];

const PRO_LAYOUTS = [
  { id: 'sleek', name: 'Sleek', desc: 'İnce kenarlık, geniş boşluk', pro: true },
  { id: 'portfolio', name: 'Portfolio', desc: 'Proje odaklı grid', pro: true },
  { id: 'gamer', name: 'Gamer', desc: 'Kalın glow, koyu tema', pro: true },
  { id: 'creator', name: 'Creator', desc: 'İçerik üretici düzeni', pro: true },
  { id: 'glass_pro', name: 'Glass Pro', desc: 'Cam efektli premium', pro: true },
  { id: 'magazine', name: 'Magazine', desc: 'Dergi tarzı düzen', pro: true },
];

const FREE_THEME_IDS = ['dark', 'midnight', 'glass', 'minimal', 'neon', 'aurora', 'clean', 'gamer'];
const PRO_THEME_IDS = ['cyber', 'obsidian', 'crimson', 'ocean', 'violet', 'minimal_pro'];

const FONT_OPTIONS = [
  { value: '', label: 'Varsayılan (Inter)' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
];

export function AppearancePage() {
  const { profile, refreshProfile } = useAuth();
  const { can, isPro } = useEntitlements();
  const toast = useToast();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeId, setThemeId] = useState(profile?.theme_id ?? 'dark');
  const [layoutId, setLayoutId] = useState(profile?.layout_id ?? 'classic');
  const [customCss, setCustomCss] = useState('');
  const [customFont, setCustomFont] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [removeBranding, setRemoveBranding] = useState(false);
  const [showProBadge, setShowProBadge] = useState(false);
  const [bgType, setBgType] = useState('none');
  const [bgColor, setBgColor] = useState('#0a0a0a');
  const [bgGradient, setBgGradient] = useState('');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgVideoUrl, setBgVideoUrl] = useState('');
  const [bgOpacity, setBgOpacity] = useState(1);
  const [bgBlur, setBgBlur] = useState(0);
  const [showCssEditor, setShowCssEditor] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showBackgroundEditor, setShowBackgroundEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gatedFeature, setGatedFeature] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('themes').select('*').order('name').then(({ data }) => setThemes((data as Theme[]) ?? []));
  }, []);

  useEffect(() => {
    if (profile) {
      setThemeId(profile.theme_id);
      setLayoutId(profile.layout_id);
      setCustomCss(profile.custom_css ?? '');
      setCustomFont(profile.custom_font ?? '');
      setAccentColor(profile.accent_color ?? '');
      setRemoveBranding(profile.remove_branding);
      setShowProBadge(profile.show_pro_badge);
      setBgType(profile.background_type ?? 'none');
      const cfg = profile.background_config ?? {};
      setBgColor((cfg.color as string) ?? '#0a0a0a');
      setBgGradient((cfg.gradient as string) ?? '');
      setBgImageUrl((cfg.url as string) ?? '');
      setBgVideoUrl((cfg.url as string) ?? '');
      setBgOpacity((cfg.opacity as number) ?? 1);
      setBgBlur((cfg.blur as number) ?? 0);
    }
  }, [profile]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const buildBgConfig = (): Record<string, unknown> => {
    if (bgType === 'color') return { color: bgColor };
    if (bgType === 'gradient') return { gradient: bgGradient };
    if (bgType === 'image') return { url: bgImageUrl, opacity: bgOpacity, blur: bgBlur };
    if (bgType === 'video') return { url: bgVideoUrl, opacity: bgOpacity };
    return {};
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        theme_id: themeId,
        layout_id: layoutId,
        custom_css: customCss || '',
        custom_font: customFont || '',
        accent_color: accentColor || '',
        remove_branding: removeBranding,
        show_pro_badge: showProBadge,
        background_type: bgType,
        background_config: buildBgConfig(),
      });
      await refreshProfile();
      toast('Görünüm kaydedildi.', 'success');
    } catch {
      toast('Kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectTheme = (id: string, isProTheme: boolean) => {
    if (isProTheme && !can('advanced_themes')) { setGatedFeature('advanced_themes'); return; }
    setThemeId(id);
  };

  const selectLayout = (l: { id: string; pro: boolean }) => {
    if (l.pro && !can('premium_layouts')) { setGatedFeature('premium_layouts'); return; }
    setLayoutId(l.id);
  };

  const allLayouts = [...FREE_LAYOUTS, ...PRO_LAYOUTS];
  const freeThemes = themes.filter((t) => FREE_THEME_IDS.includes(t.id));
  const proThemes = themes.filter((t) => PRO_THEME_IDS.includes(t.id));

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Görünüm</h1>
          <p className="mt-1 text-sm text-ink-200">Tema, düzen ve gelişmiş özelleştirme.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Kaydet'}</button>
      </div>

      {/* Themes */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-white">
          <Palette className="h-4 w-4 text-accent" /> Temalar
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {freeThemes.map((t) => (
            <ThemeCard key={t.id} theme={t} active={themeId === t.id} onClick={() => selectTheme(t.id, false)} />
          ))}
          {proThemes.map((t) => (
            <ThemeCard key={t.id} theme={t} active={themeId === t.id} pro onClick={() => selectTheme(t.id, true)} locked={!isPro} />
          ))}
        </div>
      </div>

      {/* Layouts */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-white">
          <Palette className="h-4 w-4 text-accent" /> Düzenler
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allLayouts.map((l) => (
            <LayoutCard key={l.id} layout={l} active={layoutId === l.id} onClick={() => selectLayout(l)} locked={l.pro && !isPro} />
          ))}
        </div>
      </div>

      {/* Accent color override */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-white">
          <Palette className="h-4 w-4 text-accent" /> Vurgu Rengi
        </h2>
        <div className="card flex items-center gap-4 p-4">
          <input type="color" value={accentColor || '#b9ff3d'} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Özel vurgu rengi</p>
            <p className="text-xs text-ink-300">Tema rengini geçersiz kılar. Boş bırakırsan tema rengi kullanılır.</p>
          </div>
          {accentColor && <button onClick={() => setAccentColor('')} className="btn-ghost text-xs">Sıfırla</button>}
        </div>
      </div>

      {/* Advanced features */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-white">
          <Code className="h-4 w-4 text-accent" /> Gelişmiş Özelleştirme
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => { if (can('custom_css')) setShowCssEditor(true); else setGatedFeature('custom_css'); }}
            className={`card group flex items-center gap-3 p-4 text-left transition hover:border-accent/20 ${!isPro ? 'opacity-75' : ''}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              {can('custom_css') ? <Code className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Özel CSS</p>
              <p className="text-xs text-ink-300">Profil stilini tamamen özelleştir</p>
            </div>
            {customCss && <span className="chip border-success/30 text-success text-[10px]">Aktif</span>}
            {!can('custom_css') && <span className="chip border-accent/30 text-accent">PRO</span>}
          </button>

          <button
            onClick={() => { if (can('custom_fonts')) setShowFontPicker(true); else setGatedFeature('custom_fonts'); }}
            className={`card group flex items-center gap-3 p-4 text-left transition hover:border-accent/20 ${!isPro ? 'opacity-75' : ''}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              {can('custom_fonts') ? <Type className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Özel Fontlar</p>
              <p className="text-xs text-ink-300">{customFont ? 'Seçili: ' + customFont.split(',')[0].replace(/"/g, '') : 'Font ailesi seç'}</p>
            </div>
            {!can('custom_fonts') && <span className="chip border-accent/30 text-accent">PRO</span>}
          </button>

          <button
            onClick={() => { if (can('advanced_backgrounds')) setShowBackgroundEditor(true); else setGatedFeature('advanced_backgrounds'); }}
            className={`card group flex items-center gap-3 p-4 text-left transition hover:border-accent/20 ${!isPro ? 'opacity-75' : ''}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              {can('advanced_backgrounds') ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Arka Plan</p>
              <p className="text-xs text-ink-300">{bgType === 'none' ? 'Varsayılan' : bgType === 'color' ? 'Renk' : bgType === 'gradient' ? 'Gradyan' : bgType === 'image' ? 'Görsel' : 'Video'}</p>
            </div>
            {!can('advanced_backgrounds') && <span className="chip border-accent/30 text-accent">PRO</span>}
          </button>

          <div className="card flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              {can('pro_badge') ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">PRO Rozeti</p>
              <p className="text-xs text-ink-300">Profilinde PRO rozeti göster</p>
            </div>
            <Toggle label="PRO rozeti" checked={showProBadge} onChange={(v) => { if (can('pro_badge')) setShowProBadge(v); else setGatedFeature('pro_badge'); }} />
          </div>

          <div className="card flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
              {can('remove_branding') ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">B.io Markasını Kaldır</p>
              <p className="text-xs text-ink-300">Profil altındaki B.io bağlantısını gizle</p>
            </div>
            <Toggle label="B.io markasını kaldır" checked={removeBranding} onChange={(v) => { if (can('remove_branding')) setRemoveBranding(v); else setGatedFeature('remove_branding'); }} />
          </div>
        </div>
      </div>

      {/* CSS Editor */}
      {showCssEditor && (
        <CssEditorModal
          css={customCss}
          onSave={(css) => { setCustomCss(css); setShowCssEditor(false); toast('Özel CSS kaydedildi. Değişiklikler kaydet tuşuyla uygulanır.', 'info'); }}
          onClose={() => setShowCssEditor(false)}
        />
      )}

      {/* Font Picker */}
      {showFontPicker && (
        <FontPickerModal
          currentFont={customFont}
          onSave={(font) => { setCustomFont(font); setShowFontPicker(false); toast('Font seçildi. Değişiklikler kaydet tuşuyla uygulanır.', 'info'); }}
          onClose={() => setShowFontPicker(false)}
        />
      )}

      {/* Background Editor */}
      {showBackgroundEditor && (
        <BackgroundEditorModal
          bgType={bgType}
          bgColor={bgColor}
          bgGradient={bgGradient}
          bgImageUrl={bgImageUrl}
          bgVideoUrl={bgVideoUrl}
          bgOpacity={bgOpacity}
          bgBlur={bgBlur}
          canVideo={can('video_background')}
          onSave={(cfg) => {
            setBgType(cfg.type);
            setBgColor(cfg.color);
            setBgGradient(cfg.gradient);
            setBgImageUrl(cfg.imageUrl);
            setBgVideoUrl(cfg.videoUrl);
            setBgOpacity(cfg.opacity);
            setBgBlur(cfg.blur);
            setShowBackgroundEditor(false);
            toast('Arka plan ayarlandı. Değişiklikler kaydet tuşuyla uygulanır.', 'info');
          }}
          onClose={() => setShowBackgroundEditor(false)}
        />
      )}

      {gatedFeature && <UpgradeModal open={!!gatedFeature} onClose={() => setGatedFeature(null)} featureKey={gatedFeature} />}
    </DashboardLayout>
  );
}

function ThemeCard({ theme, active, pro, locked, onClick }: { theme: Theme; active: boolean; pro?: boolean; locked?: boolean; onClick: () => void }) {
  const bg = theme.config.background ?? '#0a0a0a';
  const surface = theme.config.surface ?? '#141414';
  const accent = theme.config.accent ?? '#b9ff3d';
  return (
    <button onClick={onClick} className={`card relative overflow-hidden p-4 text-left transition ${active ? 'border-accent/40 shadow-glow' : 'hover:border-white/20'} ${locked ? 'opacity-60' : ''}`}>
      <div className="mb-3 h-20 rounded-lg" style={{ background: bg }}>
        <div className="flex h-full items-center justify-center gap-2 p-3">
          <span className="h-8 w-8 rounded-full" style={{ background: surface }} />
          <div className="flex-1 space-y-1">
            <span className="block h-2 w-3/4 rounded-full" style={{ background: accent }} />
            <span className="block h-2 w-1/2 rounded-full" style={{ background: surface }} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">{theme.name}</p>
        {pro && <span className="chip border-accent/30 text-accent text-[10px]">PRO</span>}
      </div>
      {active && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-accent text-ink-950"><Check className="h-3.5 w-3.5" /></span>}
      {locked && <span className="absolute right-3 top-3 text-ink-300"><Lock className="h-4 w-4" /></span>}
    </button>
  );
}

function LayoutCard({ layout, active, onClick, locked }: { layout: { id: string; name: string; desc: string; pro: boolean }; active: boolean; onClick: () => void; locked?: boolean }) {
  return (
    <button onClick={onClick} className={`card relative p-4 text-left transition ${active ? 'border-accent/40 shadow-glow' : 'hover:border-white/20'} ${locked ? 'opacity-60' : ''}`}>
      <div className="mb-3 flex h-16 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <LayoutPreview id={layout.id} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">{layout.name}</p>
        {layout.pro && <span className="chip border-accent/30 text-accent text-[10px]">PRO</span>}
      </div>
      <p className="text-xs text-ink-300">{layout.desc}</p>
      {active && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-accent text-ink-950"><Check className="h-3.5 w-3.5" /></span>}
      {locked && <span className="absolute right-3 top-3 text-ink-300"><Lock className="h-4 w-4" /></span>}
    </button>
  );
}

function LayoutPreview({ id }: { id: string }) {
  const bars = (n: number, w: string) => (
    <div className="flex flex-col items-center gap-1">
      <span className="h-2 w-8 rounded-full bg-accent/60" />
      {Array.from({ length: n }).map((_, i) => <span key={i} className="h-1.5 rounded-full bg-white/20" style={{ width: w }} />)}
    </div>
  );
  if (id === 'classic') return bars(3, '40px');
  if (id === 'modern') return <div className="flex items-center gap-2">{bars(2, '30px')}<span className="h-8 w-8 rounded-full bg-accent/40" /></div>;
  if (id === 'minimal') return bars(2, '50px');
  if (id === 'sleek') return <div className="flex gap-1">{bars(2, '20px')}{bars(2, '20px')}</div>;
  if (id === 'portfolio') return <div className="grid grid-cols-2 gap-1">{bars(1, '20px')}{bars(1, '20px')}{bars(1, '20px')}{bars(1, '20px')}</div>;
  if (id === 'gamer') return <div className="text-xs font-bold text-accent glow-text">GAMER</div>;
  if (id === 'creator') return <div className="flex flex-col gap-1">{bars(1, '40px')}<span className="h-6 w-16 rounded bg-accent/30" /></div>;
  if (id === 'glass_pro') return <div className="rounded-lg border border-white/20 bg-white/5 p-2">{bars(2, '30px')}</div>;
  if (id === 'magazine') return <div className="grid grid-cols-3 gap-0.5">{Array.from({length:3}).map((_,i)=><span key={i} className="h-8 rounded bg-white/10" />)}</div>;
  return bars(2, '30px');
}

function CssEditorModal({ css, onSave, onClose }: { css: string; onSave: (css: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(css);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl animate-slide-up">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-white">Özel CSS Editörü</h2>
            <button onClick={onClose} className="text-ink-300 hover:text-white">✕</button>
          </div>
          <div className="p-4">
            <p className="mb-2 text-xs text-ink-300">CSS doğrudan profil sayfasına enjekte edilir. JavaScript izin verilmez.</p>
            <textarea
              className="input min-h-[300px] resize-none font-mono text-xs"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder=".profile-card { border-radius: 24px; }"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setValue('')} className="btn-ghost">Sıfırla</button>
              <button onClick={() => onSave(value)} className="btn-primary">Kaydet</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FontPickerModal({ currentFont, onSave, onClose }: { currentFont: string; onSave: (font: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-white">Font Seç</h2>
            <button onClick={onClose} className="text-ink-300 hover:text-white">✕</button>
          </div>
          <div className="space-y-2 p-4">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => onSave(f.value)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${currentFont === f.value ? 'border-accent/40 bg-accent/5' : 'border-white/[0.06] hover:border-white/20'}`}
              >
                <span className="text-sm text-white" style={{ fontFamily: f.value || 'Inter, sans-serif' }}>{f.label}</span>
                {currentFont === f.value && <Check className="h-4 w-4 text-accent" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type BgConfig = {
  type: string; color: string; gradient: string; imageUrl: string; videoUrl: string; opacity: number; blur: number;
};

function BackgroundEditorModal({ bgType, bgColor, bgGradient, bgImageUrl, bgVideoUrl, bgOpacity, bgBlur, canVideo, onSave, onClose }: {
  bgType: string; bgColor: string; bgGradient: string; bgImageUrl: string; bgVideoUrl: string; bgOpacity: number; bgBlur: number;
  canVideo: boolean; onSave: (cfg: BgConfig) => void; onClose: () => void;
}) {
  const [type, setType] = useState(bgType);
  const [color, setColor] = useState(bgColor);
  const [gradient, setGradient] = useState(bgGradient);
  const [imageUrl, setImageUrl] = useState(bgImageUrl);
  const [videoUrl, setVideoUrl] = useState(bgVideoUrl);
  const [opacity, setOpacity] = useState(bgOpacity);
  const [blur, setBlur] = useState(bgBlur);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-white">Arka Plan Düzenleyici</h2>
            <button onClick={onClose} className="text-ink-300 hover:text-white">✕</button>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="label">Arka plan türü</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="none" className="bg-ink-900">Varsayılan (tema rengi)</option>
                <option value="color" className="bg-ink-900">Düz renk</option>
                <option value="gradient" className="bg-ink-900">Gradyan</option>
                <option value="image" className="bg-ink-900">Görsel</option>
                {canVideo && <option value="video" className="bg-ink-900">Video</option>}
              </select>
            </div>
            {type === 'color' && (
              <div>
                <label className="label">Renk</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-white/[0.08] bg-transparent" />
              </div>
            )}
            {type === 'gradient' && (
              <div>
                <label className="label">Gradyan CSS</label>
                <input className="input" value={gradient} onChange={(e) => setGradient(e.target.value)} placeholder="linear-gradient(135deg, #1a1a2e, #16213e)" />
                <p className="mt-1 text-xs text-ink-300">CSS gradyan değeri gir.</p>
              </div>
            )}
            {type === 'image' && (
              <>
                <div>
                  <label className="label">Görsel URL</label>
                  <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="label">Opaklık: {opacity.toFixed(2)}</label>
                  <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-accent" />
                </div>
                <div>
                  <label className="label">Bulanıklık: {blur}px</label>
                  <input type="range" min={0} max={20} step={1} value={blur} onChange={(e) => setBlur(parseInt(e.target.value))} className="w-full accent-accent" />
                </div>
              </>
            )}
            {type === 'video' && (
              <>
                <div>
                  <label className="label">Video URL</label>
                  <input className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://...mp4" />
                </div>
                <div>
                  <label className="label">Opaklık: {opacity.toFixed(2)}</label>
                  <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-accent" />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-ghost">Vazgeç</button>
              <button onClick={() => onSave({ type, color, gradient, imageUrl, videoUrl, opacity, blur })} className="btn-primary">Kaydet</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
