import { type ReactNode, useState } from 'react';
import {
  BarChart3, CreditCard, Disc3, Globe, Image as ImageIcon, Layout, Link2, LogOut, Menu, Music,
  Palette, Settings as SettingsIcon, Sparkles, User, Wrench, X, LifeBuoy,
} from 'lucide-react';
import { Link, useRouter } from '@/components/Router';
import { Logo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlements';

const nav = [
  { to: '/dashboard', label: 'Genel Bakış', icon: Sparkles },
  { to: '/dashboard/profile', label: 'Profil', icon: User },
  { to: '/dashboard/links', label: 'Bağlantılar', icon: Link2 },
  { to: '/dashboard/socials', label: 'Sosyal', icon: Link2 },
  { to: '/dashboard/projects', label: 'Projeler', icon: Layout },
  { to: '/dashboard/widgets', label: 'Widgetlar', icon: Wrench },
  { to: '/dashboard/discord', label: 'Discord', icon: Disc3 },
  { to: '/dashboard/appearance', label: 'Görünüm', icon: Palette },
  { to: '/dashboard/media', label: 'Medya', icon: ImageIcon },
  { to: '/dashboard/music', label: 'Müzik', icon: Music },
  { to: '/dashboard/analytics', label: 'Analitik', icon: BarChart3 },
  { to: '/dashboard/seo', label: 'SEO', icon: BarChart3 },
  { to: '/dashboard/domains', label: 'Alan Adı', icon: Globe },
  { to: '/dashboard/billing', label: 'Faturalama', icon: CreditCard },
  { to: '/dashboard/support', label: 'Destek', icon: LifeBuoy },
  { to: '/dashboard/settings', label: 'Ayarlar', icon: SettingsIcon },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { profile, signOut } = useAuth();
  const { isPro } = useEntitlements();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        {isPro ? (
          <span className="chip border-accent/40 bg-accent/10 text-accent text-[10px]">PRO</span>
        ) : (
          <Link to="/pricing" className="chip border-accent/30 text-accent text-[10px] transition hover:bg-accent/10">UPGRADE</Link>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 no-scrollbar">
        {nav.map((item) => {
          const active = path === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? 'bg-accent/10 text-accent'
                  : 'text-ink-100 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        {profile && (
          <Link
            to={`/${profile.username}`}
            className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-100 transition hover:bg-white/[0.04] hover:text-white"
          >
            <span className="font-mono text-xs text-accent">b.io/{profile.username}</span>
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-100 transition hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Çıkış yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/[0.05] bg-ink-900/50 backdrop-blur-xl lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-white/[0.05] bg-ink-900 animate-slide-up">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-ink-300">
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-ink-950/70 px-5 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2">
            <Menu className="h-5 w-5" />
          </button>
          <Logo size="sm" />
          {profile && (
            <Link to={`/${profile.username}`} className="btn-ghost text-xs">
              Profili gör
            </Link>
          )}
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
