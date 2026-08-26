import { type ReactNode, useEffect, useState } from 'react';
import {
  BarChart3, CreditCard, FileText, Image as ImageIcon, Layout, LogOut, Menu,
  Shield, Users, X, LifeBuoy, Settings as SettingsIcon, Activity,
} from 'lucide-react';
import { Link, useRouter } from '@/components/Router';
import { Logo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const adminNav = [
  { to: '/admin', label: 'Genel Bakış', icon: Layout },
  { to: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { to: '/admin/subscriptions', label: 'Abonelikler', icon: CreditCard },
  { to: '/admin/support', label: 'Destek', icon: LifeBuoy },
  { to: '/admin/reports', label: 'Raporlar', icon: FileText },
  { to: '/admin/media', label: 'Medya', icon: ImageIcon },
  { to: '/admin/analytics', label: 'Analitik', icon: BarChart3 },
  { to: '/admin/settings', label: 'Ayarlar', icon: SettingsIcon },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { signOut, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      try {
        const { data } = await supabase.rpc('is_admin', { uid: user.id });
        setIsAdmin((data as boolean) ?? false);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="animate-pulse text-ink-300">Yetki kontrol ediliyor...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-5 text-center">
        <Shield className="h-12 w-12 text-danger" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Erişim Reddedildi</h1>
        <p className="mt-2 text-sm text-ink-200">Bu sayfaya erişim yetkiniz yok.</p>
        <Link to="/dashboard" className="btn-primary mt-6">Panele dön</Link>
      </div>
    );
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <span className="chip border-danger/30 bg-danger/10 text-danger text-[10px]">ADMIN</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 no-scrollbar">
        {adminNav.map((item) => {
          const active = path === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active ? 'bg-danger/10 text-danger' : 'text-ink-100 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <Link to="/dashboard" className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-100 transition hover:bg-white/[0.04] hover:text-white">
          <Activity className="h-4 w-4" />
          Kullanıcı paneli
        </Link>
        <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-100 transition hover:bg-danger/10 hover:text-danger">
          <LogOut className="h-4 w-4" />
          Çıkış yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/[0.05] bg-ink-900/50 backdrop-blur-xl lg:block">
        {SidebarContent}
      </aside>

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

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-ink-950/70 px-5 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2">
            <Menu className="h-5 w-5" />
          </button>
          <Logo size="sm" />
          <span className="chip border-danger/30 text-danger text-[10px]">ADMIN</span>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
