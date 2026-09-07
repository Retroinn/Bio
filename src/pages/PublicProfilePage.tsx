import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, Flag, Globe, Link2, MapPin, Music, Pause, Play, Volume2, BadgeCheck, Github, ImageOff } from 'lucide-react';
import { Link } from '@/components/Router';
import { SocialIcon } from '@/components/SocialIcon';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { getProfileContent, getPublicProfile, recordLinkClick, recordProfileView } from '@/lib/profile-service';
import { detectDevice, initials, isSafeUrl, normalizeUrl } from '@/lib/utils';
import { resolveTheme, resolveBackground, applyThemeCSS, cardStyle, buttonStyle, type ResolvedTheme } from '@/lib/theme-engine';
import type { Link as LinkType, MediaItem, MusicTrack, Profile, Project, SocialLink, Theme, Widget } from '@/lib/types';

export function PublicProfilePage({ username }: { username: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [theme, setTheme] = useState<Theme | null | null>(null);
  const [content, setContent] = useState<{ links: LinkType[]; socials: SocialLink[]; projects: Project[]; widgets: Widget[]; music: MusicTrack[]; media: MediaItem[] } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    (async () => {
      let p: Profile | null;
      try {
        p = await getPublicProfile(username);
      } catch {
        setProfile(null);
        return;
      }
      if (!p) { setProfile(null); return; }
      setProfile(p);
      const [c, musicRes, themeRes, mediaRes] = await Promise.all([
        getProfileContent(p.id),
        supabase.from('music_tracks').select('*').eq('profile_id', p.id).eq('is_active', true).order('position', { ascending: true }),
        supabase.from('themes').select('*').eq('id', p.theme_id).maybeSingle(),
        supabase.from('media').select('*').eq('profile_id', p.id).eq('type', 'image').order('created_at', { ascending: false }),
      ]);
      setTheme((themeRes.data as Theme | null) ?? null);
      setContent({
        links: c.links ?? [],
        socials: c.socials ?? [],
        projects: c.projects ?? [],
        widgets: c.widgets ?? [],
        music: (musicRes.data as MusicTrack[]) ?? [],
        media: (mediaRes.data as MediaItem[]) ?? [],
      });
      recordProfileView(p.id);
    })();
  }, [username]);

  useEffect(() => {
    if (profile && theme !== null) {
      const resolved = resolveTheme(profile, theme);
      applyThemeCSS(resolved);
      const canonicalUrl = `https://b-io.xyz/${profile.username}`;
      document.title = profile.seo_title || `${profile.display_name || profile.username} — B.io`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', profile.seo_description || profile.bio || `b.io/${profile.username}`);
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
      canonical.setAttribute('href', canonicalUrl);
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
      ogTitle.setAttribute('content', profile.seo_title || `${profile.display_name || profile.username} — B.io`);
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) { ogDesc = document.createElement('meta'); ogDesc.setAttribute('property', 'og:description'); document.head.appendChild(ogDesc); }
      ogDesc.setAttribute('content', profile.seo_description || profile.bio || `b.io/${profile.username}`);
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (!ogUrl) { ogUrl = document.createElement('meta'); ogUrl.setAttribute('property', 'og:url'); document.head.appendChild(ogUrl); }
      ogUrl.setAttribute('content', canonicalUrl);
      if (profile.seo_image) {
        let ogImg = document.querySelector('meta[property="og:image"]');
        if (!ogImg) { ogImg = document.createElement('meta'); ogImg.setAttribute('property', 'og:image'); document.head.appendChild(ogImg); }
        ogImg.setAttribute('content', profile.seo_image);
      }
      if (profile.seo_indexable) {
        document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index, follow');
      } else {
        let noindex = document.querySelector('meta[name="robots"]');
        if (!noindex) { noindex = document.createElement('meta'); noindex.setAttribute('name', 'robots'); document.head.appendChild(noindex); }
        noindex.setAttribute('content', 'noindex, nofollow');
      }
    }
    return () => {
      document.title = 'B.io — Kimliğin, tek bağlantıda.';
      document.querySelector('link[rel="canonical"]')?.remove();
    };
  }, [profile, theme]);

  if (profile === undefined) return <ProfileSkeleton />;

  if (profile === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <div className="absolute left-1/2 top-0 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />
        <p className="font-mono text-6xl text-accent">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Profil bulunamadı</h1>
        <p className="mt-2 text-sm text-ink-200">b.io/{username} adresinde herkese açık bir profil yok.</p>
        <div className="mt-6 flex gap-2">
          <Link to="/" className="btn-outline">Ana sayfa</Link>
          <Link to="/register" className="btn-primary">Kendi profilini oluştur</Link>
        </div>
      </div>
    );
  }

  const resolvedTheme = resolveTheme(profile, theme);
  const bg = resolveBackground(profile);
  const bgVideoSound = (profile.background_config?.video_sound as boolean) ?? false;
  if (typeof window !== 'undefined') (window as unknown as { __bgVideoSound?: boolean }).__bgVideoSound = bgVideoSound;
  const visibleSocials = profile.show_socials ? content?.socials.filter((s) => s.is_active) ?? [] : [];
  const visibleLinks = content?.links.filter((l) => l.is_active) ?? [];
  const visibleProjects = profile.show_projects ? content?.projects.filter((p) => p.is_visible) ?? [] : [];
  const visibleMusic = profile.show_music ? content?.music ?? [] : [];
  const visibleWidgets = content?.widgets.filter((w) => w.is_visible) ?? [];
  const visibleMedia = profile.show_media ? content?.media ?? [] : [];

  return (
    <div
      className="relative min-h-screen overflow-x-hidden pb-12"
      style={{
        backgroundColor: resolvedTheme.background,
        ...bg.containerStyle,
      }}
    >
      {bg.videoEl}

      {profile.banner_url && <ProfileBanner url={profile.banner_url} theme={resolvedTheme} />}

      <ProfileLayout
        profile={profile}
        theme={resolvedTheme}
        socials={visibleSocials}
        links={visibleLinks}
        projects={visibleProjects}
        music={visibleMusic}
        widgets={visibleWidgets}
        onLinkClick={(link) => { recordLinkClick(profile.id, link.id, 'link_click'); window.open(normalizeUrl(link.url), '_blank', 'noopener,noreferrer'); }}
        onSocialClick={(social) => { recordLinkClick(profile.id, social.id, 'social_click'); window.open(normalizeUrl(social.url), '_blank', 'noopener,noreferrer'); }}
        onProjectClick={(project) => { if (project.project_url) { recordLinkClick(profile.id, project.id, 'project_click'); window.open(normalizeUrl(project.project_url), '_blank', 'noopener,noreferrer'); } }}
      />
      <MediaSection media={visibleMedia} theme={resolvedTheme} />

      <div className="relative z-10 mt-8 flex justify-center px-5 pb-4">
        <button onClick={() => setShowReport(true)} className="btn-ghost text-xs" style={{ color: resolvedTheme.text, opacity: 0.5 }}><Flag className="h-3.5 w-3.5" /> Raporla</button>
      </div>

      {bg.overlayStyle && <div className="fixed inset-0 z-0 pointer-events-none" style={bg.overlayStyle} />}

      {profile.custom_css && <style>{profile.custom_css}</style>}

      <Modal open={showReport} onClose={() => setShowReport(false)} title="Profili raporla" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-ink-100">Bu profili neden raporluyorsun?</p>
          <div className="space-y-2">
            {[
              { id: 'spam', label: 'Spam' },
              { id: 'harassment', label: 'Taciz' },
              { id: 'inappropriate', label: 'Uygunsuz içerik' },
              { id: 'copyright', label: 'Telif hakkı ihlali' },
              { id: 'other', label: 'Diğer' },
            ].map((r) => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${reportReason === r.id ? 'border-accent/40 bg-accent/5' : 'border-white/[0.06] hover:border-white/20'}`}>
                <input type="radio" name="reason" value={r.id} checked={reportReason === r.id} onChange={(e) => setReportReason(e.target.value)} className="accent-accent" />
                <span className="text-sm text-ink-50">{r.label}</span>
              </label>
            ))}
          </div>
          {!user && <p className="text-xs text-danger">Raporlamak için giriş yapmalısın.</p>}
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowReport(false)}>Vazgeç</button>
            <button onClick={submitReport} disabled={reporting || !user} className="btn-danger">{reporting ? 'Gönderiliyor...' : 'Raporla'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );

  async function submitReport() {
    if (!profile || !user) { toast('Raporlamak için giriş yapmalısın.', 'error'); return; }
    setReporting(true);
    const { error } = await supabase.from('reports').insert({ profile_id: profile.id, reporter_id: user.id, reason: reportReason, device: detectDevice() });
    setReporting(false);
    if (error) { toast('Rapor gönderilemedi.', 'error'); return; }
    toast('Rapor gönderildi. Teşekkürler.', 'success');
    setShowReport(false);
  }
}

// --- Layout System ---

function ProfileLayout({
  profile, theme, socials, links, projects, music, widgets,
  onLinkClick, onSocialClick, onProjectClick,
}: {
  profile: Profile;
  theme: ResolvedTheme;
  socials: SocialLink[];
  links: LinkType[];
  projects: Project[];
  music: MusicTrack[];
  widgets: Widget[];
  onLinkClick: (link: LinkType) => void;
  onSocialClick: (social: SocialLink) => void;
  onProjectClick: (project: Project) => void;
}) {
  const layoutId = profile.layout_id ?? 'classic';

  switch (layoutId) {
    case 'modern':
      return <ModernLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    case 'minimal':
      return <MinimalLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    case 'sleek':
      return <SleekLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    case 'portfolio':
      return <PortfolioLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    case 'gamer':
      return <GamerLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    case 'creator':
      return <CreatorLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    case 'glass_pro':
      return <GlassProLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    case 'magazine':
      return <MagazineLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
    default:
      return <ClassicLayout profile={profile} theme={theme} socials={socials} links={links} projects={projects} music={music} widgets={widgets} onLinkClick={onLinkClick} onSocialClick={onSocialClick} onProjectClick={onProjectClick} />;
  }
}

// --- Shared Components ---

function MediaSection({ media, theme }: { media: MediaItem[]; theme: ResolvedTheme }) {
  if (media.length === 0) return null;
  return (
    <section className="relative z-10 mx-auto mt-6 max-w-3xl px-5">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Medya</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item) => (
          <SafeImage key={item.id} src={item.url} alt={item.file_name} className="aspect-square w-full object-cover" containerClassName="overflow-hidden rounded-xl" style={cardStyle(theme)} />
        ))}
      </div>
    </section>
  );
}

function ProfileBanner({ url, theme }: { url: string; theme: ResolvedTheme }) {
  if (!isSafeUrl(url)) return null;
  return (
    <div className="relative z-10 mx-auto mt-2 h-32 w-full max-w-3xl overflow-hidden px-5 sm:h-40">
      <SafeImage
        src={url}
        alt=""
        className="h-full w-full rounded-2xl object-cover"
        containerClassName="h-full w-full"
        style={{ border: `1px solid ${theme.borderColor}`, boxShadow: theme.shadow }}
      />
    </div>
  );
}

function AvatarBlock({ profile, theme, size = 96 }: { profile: Profile; theme: ResolvedTheme; size?: number }) {
  const showImg = profile.avatar_url && isSafeUrl(profile.avatar_url);
  return (
    <div className="relative mx-auto w-fit" style={{ width: size }}>
      <div className="grid place-items-center overflow-hidden rounded-full bg-gradient-to-br p-0.5" style={{ width: size, height: size, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}80)` }}>
        {showImg ? (
          <SafeImage
            src={profile.avatar_url!}
            alt={profile.display_name}
            className="h-full w-full rounded-full object-cover"
            containerClassName="h-full w-full"
          />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-full font-display font-bold" style={{ backgroundColor: theme.surface, color: theme.accent, fontSize: size * 0.3 }}>
            {initials(profile.display_name || profile.username)}
          </span>
        )}
      </div>
      {profile.show_activity && profile.status_text && (
        <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 bg-success" style={{ borderColor: theme.surface }} title={profile.status_text} />
      )}
    </div>
  );
}

function ProfileHeader({ profile, theme, center = true }: { profile: Profile; theme: ResolvedTheme; center?: boolean }) {
  return (
    <div className={center ? 'text-center' : ''}>
      <div className="flex items-center justify-center gap-2">
        <h1 className="font-display text-xl font-bold" style={{ color: theme.text }}>{profile.display_name || profile.username}</h1>
        {profile.show_pro_badge && (
          <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
            <BadgeCheck className="h-3 w-3" /> PRO
          </span>
        )}
      </div>
      <p className="text-sm" style={{ color: theme.accent }}>@{profile.username}</p>
      {profile.status_text && profile.show_activity && <p className="mt-1 text-xs" style={{ color: theme.text, opacity: 0.7 }}>{profile.status_text}</p>}
      {profile.bio && <p className="mt-3 text-sm" style={{ color: theme.text, opacity: 0.85 }}>{profile.bio}</p>}
      <div className={`mt-3 flex items-center gap-4 text-xs ${center ? 'justify-center' : ''}`} style={{ color: theme.text, opacity: 0.6 }}>
        {profile.show_location && profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>}
        {profile.website && (() => {
          try {
            return <a href={normalizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: theme.accent }}><Globe className="h-3 w-3" /> {new URL(normalizeUrl(profile.website)).hostname}</a>;
          } catch { return null; }
        })()}
      </div>
    </div>
  );
}

function SocialIcons({ socials, theme, onSocialClick }: { socials: SocialLink[]; theme: ResolvedTheme; onSocialClick: (s: SocialLink) => void }) {
  if (socials.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {socials.map((s) => (
        <button key={s.id} onClick={() => onSocialClick(s)} className="grid h-10 w-10 place-items-center rounded-xl border transition hover:scale-110" style={{ borderColor: `${theme.accent}30`, backgroundColor: `${theme.surface}80`, color: theme.text }} title={s.platform}>
          <SocialIcon platform={s.platform} size={18} />
        </button>
      ))}
    </div>
  );
}

function LinkList({ links, theme, onLinkClick }: { links: LinkType[]; theme: ResolvedTheme; onLinkClick: (l: LinkType) => void }) {
  if (links.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {links.map((link) => (
        <button key={link.id} onClick={() => onLinkClick(link)} className="group flex w-full items-center justify-between border px-4 py-3.5 transition hover:scale-[1.02]" style={{ ...cardStyle(theme), borderColor: `${theme.accent}20` }}>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium">{link.title}</p>
            {link.description && <p className="truncate text-xs opacity-60">{link.description}</p>}
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-40 transition group-hover:opacity-100" style={{ color: theme.accent }} />
        </button>
      ))}
    </div>
  );
}

function WidgetList({ widgets, theme }: { widgets: Widget[]; theme: ResolvedTheme }) {
  if (widgets.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {widgets.map((w) => <WidgetRenderer key={w.id} widget={w} theme={theme} />)}
    </div>
  );
}

function ProjectGrid({ projects, theme, onProjectClick, columns = 1 }: { projects: Project[]; theme: ResolvedTheme; onProjectClick: (p: Project) => void; columns?: 1 | 2 }) {
  if (projects.length === 0) return null;
  return (
    <div className={columns === 2 ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
      {projects.map((p) => <ProjectCard key={p.id} project={p} theme={theme} onClick={() => onProjectClick(p)} />)}
    </div>
  );
}

function ProjectCard({ project, theme, onClick }: { project: Project; theme: ResolvedTheme; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group block w-full overflow-hidden text-left transition hover:scale-[1.01]" style={cardStyle(theme)}>
      {project.image_url && isSafeUrl(project.image_url) && (
        <SafeImage src={project.image_url} alt={project.title} className="h-full w-full object-cover transition group-hover:scale-105" containerClassName="aspect-video overflow-hidden" />
      )}
      <div className="p-4">
        <h3 className="font-display text-base font-semibold">{project.title}</h3>
        {project.description && <p className="mt-1 text-sm line-clamp-2" style={{ opacity: 0.7 }}>{project.description}</p>}
        {project.technologies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.technologies.map((t) => <span key={t} className="chip" style={{ borderColor: `${theme.accent}20` }}>{t}</span>)}
          </div>
        )}
      </div>
    </button>
  );
}

function MusicSection({ music, theme }: { music: MusicTrack[]; theme: ResolvedTheme }) {
  if (music.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}><Music className="h-4 w-4" /> Müzik</h2>
      <div className="space-y-2.5">
        {music.map((t) => <MusicPlayer key={t.id} track={t} theme={theme} />)}
      </div>
    </div>
  );
}

function FooterBranding({ profile, theme }: { profile: Profile; theme: ResolvedTheme }) {
  if (profile.remove_branding) return null;
  return (
    <div className="mt-8 text-center">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs hover:underline" style={{ color: theme.text, opacity: 0.5 }}>
        <Link2 className="h-3 w-3" /> B.io ile oluştur
      </Link>
    </div>
  );
}

// --- Layout Implementations ---

type LayoutProps = {
  profile: Profile;
  theme: ResolvedTheme;
  socials: SocialLink[];
  links: LinkType[];
  projects: Project[];
  music: MusicTrack[];
  widgets: Widget[];
  onLinkClick: (l: LinkType) => void;
  onSocialClick: (s: SocialLink) => void;
  onProjectClick: (p: Project) => void;
};

function ClassicLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  return (
    <div className="relative z-10 mx-auto max-w-md px-5">
      <div className="animate-slide-up p-6 text-center" style={cardStyle(theme)}>
        <AvatarBlock profile={profile} theme={theme} />
        <div className="mt-4"><ProfileHeader profile={profile} theme={theme} /></div>
      </div>
      <div className="mt-4"><SocialIcons socials={socials} theme={theme} onSocialClick={onSocialClick} /></div>
      <div className="mt-4"><LinkList links={links} theme={theme} onLinkClick={onLinkClick} /></div>
      <div className="mt-4"><WidgetList widgets={widgets} theme={theme} /></div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={theme} onProjectClick={onProjectClick} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={theme} /></div>
      <FooterBranding profile={profile} theme={theme} />
    </div>
  );
}

function ModernLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  return (
    <div className="relative z-10 mx-auto max-w-2xl px-5">
      <div className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center" style={cardStyle(theme)}>
        <AvatarBlock profile={profile} theme={theme} size={80} />
        <div className="flex-1 text-left">
          <ProfileHeader profile={profile} theme={theme} center={false} />
        </div>
      </div>
      <div className="mt-4"><SocialIcons socials={socials} theme={theme} onSocialClick={onSocialClick} /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><LinkList links={links} theme={theme} onLinkClick={onLinkClick} /></div>
        <div><WidgetList widgets={widgets} theme={theme} /></div>
      </div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={theme} onProjectClick={onProjectClick} columns={2} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={theme} /></div>
      <FooterBranding profile={profile} theme={theme} />
    </div>
  );
}

function MinimalLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  return (
    <div className="relative z-10 mx-auto max-w-sm px-5">
      <div className="py-8 text-center">
        <AvatarBlock profile={profile} theme={theme} size={64} />
        <div className="mt-4"><ProfileHeader profile={profile} theme={theme} /></div>
      </div>
      <div className="space-y-2">
        {links.map((link) => (
          <button key={link.id} onClick={() => onLinkClick(link)} className="block w-full py-2 text-center text-sm font-medium transition hover:opacity-70" style={{ color: theme.text }}>
            {link.title}
          </button>
        ))}
      </div>
      <div className="mt-4"><SocialIcons socials={socials} theme={theme} onSocialClick={onSocialClick} /></div>
      {projects.length > 0 && (
        <div className="mt-6">
          <ProjectGrid projects={projects} theme={theme} onProjectClick={onProjectClick} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={theme} /></div>
      <FooterBranding profile={profile} theme={theme} />
    </div>
  );
}

function SleekLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  return (
    <div className="relative z-10 mx-auto max-w-lg px-5">
      <div className="py-8 text-center">
        <AvatarBlock profile={profile} theme={theme} size={72} />
        <div className="mt-4"><ProfileHeader profile={profile} theme={theme} /></div>
      </div>
      <div className="space-y-4">
        <div><LinkList links={links} theme={theme} onLinkClick={onLinkClick} /></div>
        <div><SocialIcons socials={socials} theme={theme} onSocialClick={onSocialClick} /></div>
        <div><WidgetList widgets={widgets} theme={theme} /></div>
      </div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={theme} onProjectClick={onProjectClick} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={theme} /></div>
      <FooterBranding profile={profile} theme={theme} />
    </div>
  );
}

function PortfolioLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  return (
    <div className="relative z-10 mx-auto max-w-3xl px-5">
      <div className="flex items-center gap-4 p-6" style={cardStyle(theme)}>
        <AvatarBlock profile={profile} theme={theme} size={64} />
        <div className="flex-1 text-left"><ProfileHeader profile={profile} theme={theme} center={false} /></div>
      </div>
      <div className="mt-4"><SocialIcons socials={socials} theme={theme} onSocialClick={onSocialClick} /></div>
      <div className="mt-4"><LinkList links={links} theme={theme} onLinkClick={onLinkClick} /></div>
      <div className="mt-4"><WidgetList widgets={widgets} theme={theme} /></div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={theme} onProjectClick={onProjectClick} columns={2} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={theme} /></div>
      <FooterBranding profile={profile} theme={theme} />
    </div>
  );
}

function GamerLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  const gamerTheme = { ...theme, glow: `0 0 20px ${theme.accent}60`, borderColor: `${theme.accent}40` };
  return (
    <div className="relative z-10 mx-auto max-w-md px-5">
      <div className="animate-slide-up p-6 text-center" style={{ ...cardStyle(gamerTheme), boxShadow: `0 0 30px ${theme.accent}30` }}>
        <AvatarBlock profile={profile} theme={gamerTheme} />
        <div className="mt-4"><ProfileHeader profile={profile} theme={gamerTheme} /></div>
      </div>
      <div className="mt-4"><SocialIcons socials={socials} theme={gamerTheme} onSocialClick={onSocialClick} /></div>
      <div className="mt-4"><LinkList links={links} theme={gamerTheme} onLinkClick={onLinkClick} /></div>
      <div className="mt-4"><WidgetList widgets={widgets} theme={gamerTheme} /></div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={gamerTheme} onProjectClick={onProjectClick} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={gamerTheme} /></div>
      <FooterBranding profile={profile} theme={gamerTheme} />
    </div>
  );
}

function CreatorLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  return (
    <div className="relative z-10 mx-auto max-w-lg px-5">
      <div className="flex flex-col items-center gap-4 p-6" style={cardStyle(theme)}>
        <AvatarBlock profile={profile} theme={theme} size={88} />
        <ProfileHeader profile={profile} theme={theme} />
        <div className="w-full"><SocialIcons socials={socials} theme={theme} onSocialClick={onSocialClick} /></div>
      </div>
      <div className="mt-4"><LinkList links={links} theme={theme} onLinkClick={onLinkClick} /></div>
      <div className="mt-4"><WidgetList widgets={widgets} theme={theme} /></div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={theme} onProjectClick={onProjectClick} columns={2} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={theme} /></div>
      <FooterBranding profile={profile} theme={theme} />
    </div>
  );
}

function GlassProLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  const glassTheme = { ...theme, blur: '24px', cardOpacity: 0.5, borderColor: 'rgba(255,255,255,0.15)' };
  return (
    <div className="relative z-10 mx-auto max-w-md px-5">
      <div className="animate-slide-up p-6 text-center" style={cardStyle(glassTheme)}>
        <AvatarBlock profile={profile} theme={glassTheme} />
        <div className="mt-4"><ProfileHeader profile={profile} theme={glassTheme} /></div>
      </div>
      <div className="mt-4"><SocialIcons socials={socials} theme={glassTheme} onSocialClick={onSocialClick} /></div>
      <div className="mt-4"><LinkList links={links} theme={glassTheme} onLinkClick={onLinkClick} /></div>
      <div className="mt-4"><WidgetList widgets={widgets} theme={glassTheme} /></div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={glassTheme} onProjectClick={onProjectClick} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={glassTheme} /></div>
      <FooterBranding profile={profile} theme={glassTheme} />
    </div>
  );
}

function MagazineLayout({ profile, theme, socials, links, projects, music, widgets, onLinkClick, onSocialClick, onProjectClick }: LayoutProps) {
  return (
    <div className="relative z-10 mx-auto max-w-2xl px-5">
      <div className="grid grid-cols-3 gap-3 p-6" style={cardStyle(theme)}>
        <div className="col-span-1"><AvatarBlock profile={profile} theme={theme} size={80} /></div>
        <div className="col-span-2 text-left"><ProfileHeader profile={profile} theme={theme} center={false} /></div>
      </div>
      <div className="mt-4"><SocialIcons socials={socials} theme={theme} onSocialClick={onSocialClick} /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><LinkList links={links} theme={theme} onLinkClick={onLinkClick} /></div>
        <div><WidgetList widgets={widgets} theme={theme} /></div>
      </div>
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.6 }}>Projeler</h2>
          <ProjectGrid projects={projects} theme={theme} onProjectClick={onProjectClick} columns={2} />
        </div>
      )}
      <div className="mt-6"><MusicSection music={music} theme={theme} /></div>
      <FooterBranding profile={profile} theme={theme} />
    </div>
  );
}

// --- Widget Renderer ---

function WidgetRenderer({ widget, theme }: { widget: Widget; theme: ResolvedTheme }) {
  const cfg = widget.config;
  const s = cardStyle(theme);

  try {
    if (widget.type === 'text') {
      return (
        <div className="p-4" style={s}>
          {(cfg.title as string) && <h3 className="mb-1 font-display text-sm font-semibold">{cfg.title as string}</h3>}
          <p className="text-sm" style={{ opacity: 0.85 }}>{cfg.text as string}</p>
        </div>
      );
    }
    if (widget.type === 'image' && (cfg.image_url as string)) {
      return <SafeImage src={cfg.image_url as string} alt="" className="w-full" containerClassName="overflow-hidden" style={s} />;
    }
    if (widget.type === 'video' && (cfg.url as string)) {
      const url = normalizeUrl(cfg.url as string);
      if (!isSafeUrl(url)) return null;
      return (
        <div className="overflow-hidden" style={s}>
          <video controls className="w-full" preload="metadata">
            <source src={url} />
          </video>
        </div>
      );
    }
    if (widget.type === 'youtube' && (cfg.url as string)) {
      const id = extractYouTubeId(cfg.url as string);
      if (!id) return null;
      return (
        <div className="overflow-hidden" style={s}>
          <div className="aspect-video"><iframe src={`https://www.youtube.com/embed/${id}`} title="YouTube" className="h-full w-full" allowFullScreen loading="lazy" /></div>
        </div>
      );
    }
    if (widget.type === 'spotify' && (cfg.url as string)) {
      const url = cfg.url as string;
      const embed = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
      return <div className="overflow-hidden" style={s}><iframe src={embed} className="h-32 w-full" loading="lazy" title="Spotify" /></div>;
    }
    if (widget.type === 'github' && (cfg.url as string)) {
      const url = normalizeUrl(cfg.url as string);
      if (!isSafeUrl(url)) return null;
      const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
      const repoName = repoMatch?.[1] ?? 'GitHub';
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 transition hover:scale-[1.02]" style={s}>
          <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: `${theme.accent}15` }}><Github className="h-5 w-5" style={{ color: theme.accent }} /></span>
          <div className="flex-1">
            <p className="text-sm font-medium">{cfg.title as string ?? repoName}</p>
            <p className="text-xs" style={{ opacity: 0.6 }}>{repoName}</p>
          </div>
          <ExternalLink className="h-4 w-4 opacity-40" style={{ color: theme.accent }} />
        </a>
      );
    }
    if (widget.type === 'discord_server' && (cfg.invite_url as string)) {
      return (
        <div className="flex items-center gap-3 p-4" style={s}>
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#5865F2]/20 text-[#5865F2]"><SocialIcon platform="discord" size={18} /></div>
          <div className="flex-1">
            <p className="text-sm font-medium">{cfg.server_name as string}</p>
            <p className="text-xs" style={{ opacity: 0.6 }}>Discord sunucusu</p>
          </div>
          <a href={cfg.invite_url as string} target="_blank" rel="noopener noreferrer" className="text-xs" style={buttonStyle(theme)}>Katıl</a>
        </div>
      );
    }
    if (widget.type === 'countdown' && (cfg.target_date as string)) {
      return <CountdownWidget targetDate={cfg.target_date as string} title={cfg.title as string} theme={theme} />;
    }
    if (widget.type === 'custom_link' && (cfg.url as string)) {
      const url = normalizeUrl(cfg.url as string);
      if (!isSafeUrl(url)) return null;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="group flex w-full items-center justify-between border px-4 py-3.5 transition hover:scale-[1.02]" style={{ ...s, borderColor: `${theme.accent}20` }}>
          <span className="text-sm font-medium">{cfg.title as string}</span>
          <ExternalLink className="h-4 w-4 opacity-40 group-hover:opacity-100" style={{ color: theme.accent }} />
        </a>
      );
    }
    if (widget.type === 'project' && (cfg.image_url as string || cfg.title as string)) {
      return (
        <div className="overflow-hidden" style={s}>
          {cfg.image_url as string && <SafeImage src={cfg.image_url as string} alt={cfg.title as string} className="w-full" containerClassName="aspect-video overflow-hidden" />}
          <div className="p-4">
            <h3 className="font-display text-base font-semibold">{cfg.title as string}</h3>
            {cfg.text as string && <p className="mt-1 text-sm" style={{ opacity: 0.7 }}>{cfg.text as string}</p>}
          </div>
        </div>
      );
    }
  } catch {
    return null;
  }
  return null;
}

function SafeImage({ src, alt, className, containerClassName, style }: { src: string; alt: string; className?: string; containerClassName?: string; style?: React.CSSProperties }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className={`grid place-items-center ${containerClassName ?? ''}`} style={{ ...style, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <ImageOff className="h-6 w-6 text-ink-300" />
      </div>
    );
  }
  return (
    <div className={containerClassName} style={style}>
      <img src={src} alt={alt} className={className} loading="lazy" onError={() => setError(true)} />
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

function CountdownWidget({ targetDate, title, theme }: { targetDate: string; title?: string; theme: ResolvedTheme }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = new Date(targetDate).getTime() - now;
  const expired = diff <= 0;
  const days = Math.max(0, Math.floor(diff / 86400000));
  const hours = Math.max(0, Math.floor((diff % 86400000) / 3600000));
  const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
  const secs = Math.max(0, Math.floor((diff % 60000) / 1000));
  return (
    <div className="p-4 text-center" style={cardStyle(theme)}>
      {title && <h3 className="mb-2 font-display text-sm font-semibold">{title}</h3>}
      {expired ? <p className="text-sm" style={{ color: theme.accent }}>Süre doldu!</p> : (
        <div className="flex justify-center gap-2 font-mono">
          {[['gün', days], ['saat', hours], ['dk', mins], ['sn', secs]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg px-2 py-1.5" style={{ backgroundColor: `${theme.accent}10` }}>
              <p className="text-lg font-bold" style={{ color: theme.accent }}>{String(v).padStart(2, '0')}</p>
              <p className="text-[10px]" style={{ opacity: 0.6 }}>{l as string}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MusicPlayer({ track, theme }: { track: MusicTrack; theme: ResolvedTheme }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loop, setLoop] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audioUrl = normalizeUrl(track.audio_url);
    if (!isSafeUrl(audioUrl)) return;
    const a = new Audio(audioUrl);
    a.volume = volume;
    a.loop = loop;
    setAudio(a);
    const onTime = () => setProgress(a.currentTime / (a.duration || 1));
    a.addEventListener('timeupdate', onTime);
    return () => { a.pause(); a.removeEventListener('timeupdate', onTime); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.audio_url]);

  const muteBgVideo = () => {
    const v = document.getElementById('bg-video') as HTMLVideoElement | null;
    if (v) v.muted = true;
  };
  const restoreBgVideo = () => {
    const v = document.getElementById('bg-video') as HTMLVideoElement | null;
    if (!v) return;
    const cfg = (window as unknown as { __bgVideoSound?: boolean }).__bgVideoSound;
    if (cfg) v.muted = false;
  };

  const toggle = () => {
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); restoreBgVideo(); }
    else {
      document.querySelectorAll('audio').forEach((a) => { if (a !== audio) { a.pause(); } });
      audio.play().then(() => { setPlaying(true); muteBgVideo(); }).catch(() => {});
    }
  };

  const setVol = (v: number) => { setVolume(v); if (audio) audio.volume = v; };

  return (
    <div className="flex items-center gap-3 p-3" style={cardStyle(theme)}>
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg">
        {track.cover_url && isSafeUrl(track.cover_url) ? <SafeImage src={track.cover_url} alt="" className="h-full w-full object-cover" containerClassName="h-full w-full" /> : <Music className="h-5 w-5" style={{ color: theme.accent }} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs" style={{ opacity: 0.6 }}>{track.artist}</p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: `${theme.accent}20` }}>
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: theme.accent }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-full transition" style={{ backgroundColor: theme.accent, color: theme.buttonTextColor }}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={() => { setLoop((l) => !l); if (audio) audio.loop = !loop; }} className={`grid h-7 w-7 place-items-center rounded-full text-xs ${loop ? '' : 'opacity-50'}`} style={{ color: theme.accent }} title="Döngü">↻</button>
        <div className="hidden items-center gap-1 sm:flex">
          <Volume2 className="h-3.5 w-3.5" style={{ opacity: 0.5 }} />
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVol(parseFloat(e.target.value))} className="w-12 accent-accent" />
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <div className="card p-6 text-center">
        <div className="skeleton mx-auto h-24 w-24 rounded-full" />
        <div className="skeleton mx-auto mt-4 h-5 w-32" />
        <div className="skeleton mx-auto mt-2 h-4 w-20" />
        <div className="skeleton mx-auto mt-3 h-3 w-48" />
      </div>
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
