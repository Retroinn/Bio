import { type ReactNode } from 'react';
import { Link } from '@/components/Router';
import { Logo } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

export function AuthLayout({
  children,
  title,
  subtitle,
  backTo = '/',
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  backTo?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute left-1/2 top-0 -z-10 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
      <div className="absolute inset-0 -z-10 bg-grid-faint [background-size:48px_48px] opacity-30" />
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5">
          <Link to={backTo} className="btn-ghost text-sm">
            <ArrowLeft className="h-4 w-4" /> Geri
          </Link>
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <div className="w-full max-w-md animate-slide-up">
            <div className="mb-7 text-center">
              <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
              <p className="mt-2 text-sm text-ink-200">{subtitle}</p>
            </div>
            <div className="card p-6 sm:p-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OAuthButtons({ onOAuth }: { onOAuth: (provider: 'google' | 'discord') => void }) {
  return (
    <div className="grid gap-2.5">
      <button onClick={() => onOAuth('google')} className="btn-outline w-full">
        <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v2.8h5.35c-.25 1.4-1.65 4.1-5.35 4.1-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.9 3.35 14.7 2.4 12 2.4 6.95 2.4 2.85 6.5 2.85 11.55S6.95 20.7 12 20.7c5.45 0 9.05-3.8 9.05-9.15 0-.6-.05-1.1-.15-1.45z"/></svg>
        Google ile devam et
      </button>
      <button onClick={() => onOAuth('discord')} className="btn-outline w-full">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#fff"><path d="M19.5 5.5c-1.4-.65-2.9-1.1-4.45-1.35l-.2.4c1.45.8 2.7 1.8 3.7 3.05-1.4-.75-2.95-1.3-4.6-1.5-1.65.2-3.2.75-4.6 1.5 1-1.25 2.25-2.25 3.7-3.05l-.2-.4C11.4 4.4 9.9 4.85 8.5 5.5 6.2 8.9 5.6 12.2 5.9 15.45c1.65 1.25 3.25 2 4.85 2.5l.45-.7c-.85-.3-1.65-.7-2.4-1.2l.4-.3c2.3 1.1 4.8 1.1 7.1 0l.4.3c-.75.5-1.55.9-2.4 1.2l.45.7c1.6-.5 3.2-1.25 4.85-2.5.35-3.75-.6-7.05-2.1-9.95zM10.3 13.5c-.75 0-1.4-.7-1.4-1.55s.6-1.55 1.4-1.55c.8 0 1.4.7 1.4 1.55s-.6 1.55-1.4 1.55zm3.4 0c-.75 0-1.4-.7-1.4-1.55s.6-1.55 1.4-1.55c.8 0 1.4.7 1.4 1.55s-.6 1.55-1.4 1.55z"/></svg>
        Discord ile devam et
      </button>
    </div>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-ink-300">
      <span className="h-px flex-1 bg-white/[0.06]" />veya<span className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}
