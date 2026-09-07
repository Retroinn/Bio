import type { Profile, Theme } from '@/lib/types';
import { isSafeUrl } from '@/lib/utils';

export type ResolvedTheme = {
  background: string;
  surface: string;
  accent: string;
  text: string;
  accentColor: string;
  borderColor: string;
  shadow: string;
  glow: string;
  radius: string;
  font: string;
  blur: string;
  cardOpacity: number;
  buttonStyle: string;
  buttonTextColor: string;
  textMuted: string;
};

const DEFAULT_THEME: ResolvedTheme = {
  background: '#080808',
  surface: '#111111',
  accent: '#b9ff3d',
  text: '#f5f5f0',
  accentColor: '#b9ff3d',
  borderColor: 'rgba(255,255,255,0.08)',
  shadow: '0 4px 24px rgba(0,0,0,0.3)',
  glow: 'none',
  radius: '16px',
  font: 'Inter, sans-serif',
  blur: '16px',
  cardOpacity: 0.8,
  buttonStyle: 'solid',
  buttonTextColor: '#080808',
  textMuted: 'rgba(255,255,255,0.6)',
};

export function resolveTheme(profile: Profile, theme: Theme | null | undefined): ResolvedTheme {
  const cfg = theme?.config ?? {};
  const base: ResolvedTheme = {
    background: (cfg.background as string) ?? DEFAULT_THEME.background,
    surface: (cfg.surface as string) ?? DEFAULT_THEME.surface,
    accent: (cfg.accent as string) ?? DEFAULT_THEME.accent,
    text: (cfg.text as string) ?? DEFAULT_THEME.text,
    accentColor: (cfg.accent as string) ?? DEFAULT_THEME.accent,
    borderColor: (cfg.border as string) ?? DEFAULT_THEME.borderColor,
    shadow: (cfg.shadow as string) ?? DEFAULT_THEME.shadow,
    glow: (cfg.glow as string) ?? DEFAULT_THEME.glow,
    radius: (cfg.radius as string) ?? DEFAULT_THEME.radius,
    font: (cfg.font as string) ?? DEFAULT_THEME.font,
    blur: (cfg.blur as string) ?? DEFAULT_THEME.blur,
    cardOpacity: (cfg.cardOpacity as unknown as number) ?? DEFAULT_THEME.cardOpacity,
    buttonStyle: (cfg.buttonStyle as string) ?? DEFAULT_THEME.buttonStyle,
    buttonTextColor: (cfg.buttonTextColor as string) ?? DEFAULT_THEME.buttonTextColor,
    textMuted: (cfg.textMuted as string) ?? DEFAULT_THEME.textMuted,
  };

  if (profile.accent_color) {
    base.accent = profile.accent_color;
    base.accentColor = profile.accent_color;
  }
  if (profile.custom_font) {
    base.font = profile.custom_font;
  }

  return base;
}

export type BackgroundStyle = {
  containerStyle: React.CSSProperties;
  overlayStyle?: React.CSSProperties;
  videoEl?: React.ReactNode;
};

export function resolveBackground(profile: Profile): BackgroundStyle {
  const cfg = profile.background_config ?? {};
  const type = profile.background_type ?? 'none';

  if (type === 'none' || type === 'color') {
    return {
      containerStyle: {
        backgroundColor: (cfg.color as string) ?? undefined,
      },
    };
  }

  if (type === 'gradient') {
    return {
      containerStyle: {
        background: (cfg.gradient as string) ?? undefined,
      },
    };
  }

  if (type === 'image') {
    const opacity = (cfg.opacity as number) ?? 1;
    const blur = (cfg.blur as number) ?? 0;
    const url = typeof cfg.url === 'string' && isSafeUrl(cfg.url) ? cfg.url : null;
    if (!url) return { containerStyle: {} };
    return {
      containerStyle: {
        backgroundImage: `url("${url.replace(/"/g, '')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      },
      overlayStyle: {
        backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
        backgroundColor: `rgba(10,10,10,${1 - opacity})`,
      },
    };
  }

  if (type === 'video' && typeof cfg.url === 'string' && isSafeUrl(cfg.url)) {
    const videoSound = (cfg.video_sound as boolean) ?? false;
    return {
      containerStyle: {},
      videoEl: (
        <video
          id="bg-video"
          autoPlay
          loop
          playsInline
          muted={!videoSound}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: (cfg.opacity as number) ?? 1 }}
        >
          <source src={cfg.url as string} />
        </video>
      ),
    };
  }

  return { containerStyle: {} };
}

export function applyThemeCSS(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', theme.background);
  root.style.setProperty('--theme-surface', theme.surface);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-border', theme.borderColor);
  root.style.setProperty('--theme-radius', theme.radius);
  root.style.setProperty('--theme-font', theme.font);
}

export function cardStyle(theme: ResolvedTheme): React.CSSProperties {
  const surfaceColor = theme.surface.startsWith('rgba')
    ? theme.surface
    : `${theme.surface}cc`;
  return {
    backgroundColor: surfaceColor,
    backdropFilter: `blur(${theme.blur})`,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: theme.radius,
    boxShadow: theme.shadow,
    color: theme.text,
  };
}

export function buttonStyle(theme: ResolvedTheme): React.CSSProperties {
  if (theme.buttonStyle === 'outline') {
    return {
      border: `1px solid ${theme.accent}`,
      backgroundColor: 'transparent',
      color: theme.accent,
      borderRadius: theme.radius,
    };
  }
  if (theme.buttonStyle === 'ghost') {
    return {
      border: 'none',
      backgroundColor: 'transparent',
      color: theme.accent,
      borderRadius: theme.radius,
    };
  }
  return {
    backgroundColor: theme.accent,
    color: theme.buttonTextColor,
    border: 'none',
    borderRadius: theme.radius,
    boxShadow: theme.glow !== 'none' ? `0 0 20px ${theme.accent}40` : undefined,
  };
}
