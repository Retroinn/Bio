import { useEffect, useState } from 'react';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { Link, useRouter } from '@/components/Router';
import { Logo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlements';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

const FREE_FEATURES = [
  'Temel profil ve avatar',
  'Sosyal hesaplar',
  '10 bağlantıya kadar',
  '3 projeye kadar',
  'Temel temalar ve düzenler',
  '7 günlük analitik',
  'Discord bağlantısı',
  'QR kodu',
  'Temel SEO',
];

const PRO_FEATURES = [
  'Tüm Free özellikleri',
  'Gelişmiş temalar (Cyber, Aurora, Obsidian, Neon)',
  'Premium düzenler (Creator, Portfolio, Gamer, Glass Pro)',
  'Özel fontlar ve özel CSS',
  'Görsel, GIF ve video arka planlar',
  'Gelişmiş efektler ve özel imleç',
  'Sınırsız bağlantı ve proje',
  'Bağlantı küçük resimleri ve zamanlama',
  'Gelişmiş widgetlar (Discord, Spotify, YouTube, GitHub)',
  'Müzik çalar ve medya galerisi',
  '365 günlük analitik + CSV dışa aktarım',
  'Özel OG görseli ve favicon',
  'B.io markasını kaldır',
  'Özel alan adı',
  'Pro rozeti ve profil şablonları',
  'Öncelikli destek',
];

export function PricingPage() {
  const { session } = useAuth();
  const { navigate } = useRouter();
  const { plans, isPro } = useEntitlements();
  const toast = useToast();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    document.title = 'B.io — Fiyatlandırma';
  }, []);

  const freePlan = plans.find((p) => p.slug === 'free');
  const proPlan = plans.find((p) => p.slug === 'pro');
  const proPrice = cycle === 'monthly' ? proPlan?.price_monthly : proPlan?.price_yearly;
  const yearlyMonthly = proPlan ? Math.round(proPlan.price_yearly / 12) : 0;
  const yearlySavings = proPlan ? proPlan.price_monthly * 12 - proPlan.price_yearly : 0;

  const handleUpgrade = async () => {
    if (!session) {
      navigate('/register');
      return;
    }
    // Payment provider not configured yet — show clear message
    toast('Ödeme sağlayıcı henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin.', 'info');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/" className="btn-ghost text-sm">Ana sayfa</Link>
            {session ? (
              <Link to="/dashboard" className="btn-primary text-sm">Panel</Link>
            ) : (
              <Link to="/login" className="btn-primary text-sm">Giriş yap</Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Fiyatlandırma</h1>
          <p className="mt-3 text-ink-200">Başlamak ücretsiz. Pro'ya istediğin zaman yükselt.</p>
        </div>

        {/* Billing cycle toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm ${cycle === 'monthly' ? 'text-white' : 'text-ink-300'}`}>Aylık</span>
          <button
            onClick={() => setCycle((c) => (c === 'monthly' ? 'yearly' : 'monthly'))}
            className="relative h-7 w-14 rounded-full bg-white/[0.08] transition"
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-accent transition-transform ${cycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm ${cycle === 'yearly' ? 'text-white' : 'text-ink-300'}`}>Yıllık</span>
          {yearlySavings > 0 && cycle === 'yearly' && (
            <span className="chip border-accent/30 bg-accent/10 text-accent">₺{yearlySavings.toLocaleString('tr-TR')} tasarruf</span>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Free */}
          <div className="card p-7">
            <h3 className="font-display text-lg font-semibold text-white">Free</h3>
            <p className="mt-1 text-sm text-ink-200">Bireysel kullanım için</p>
            <p className="mt-5 font-display text-4xl font-bold text-white">₺0<span className="text-base font-normal text-ink-300">/ay</span></p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-ink-100">
                  <Check className="h-4 w-4 shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>
            {session ? (
              <Link to="/dashboard" className="btn-outline mt-7 w-full">Panele git</Link>
            ) : (
              <Link to="/register" className="btn-outline mt-7 w-full">Ücretsiz başla</Link>
            )}
          </div>

          {/* Pro */}
          <div className="card relative border-accent/30 p-7 shadow-glow">
            <span className="absolute -top-3 left-7 chip border-accent/40 bg-accent/10 text-accent">
              <Sparkles className="h-3 w-3" /> Pro
            </span>
            <h3 className="font-display text-lg font-semibold text-white">Pro</h3>
            <p className="mt-1 text-sm text-ink-200">Gelişmiş özellikler</p>
            {proPrice !== undefined && (
              <p className="mt-5 font-display text-4xl font-bold text-white">
                ₺{proPrice.toLocaleString('tr-TR')}
                <span className="text-base font-normal text-ink-300">{cycle === 'monthly' ? '/ay' : '/yıl'}</span>
              </p>
            )}
            {cycle === 'yearly' && yearlyMonthly > 0 && (
              <p className="mt-1 text-xs text-accent">≈ ₺{yearlyMonthly.toLocaleString('tr-TR')}/ay</p>
            )}
            <ul className="mt-5 space-y-2.5 text-sm">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-ink-100">
                  <Check className="h-4 w-4 shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>
            {isPro ? (
              <div className="mt-7 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-center text-sm text-success">
                Şu anda Pro planındasın
              </div>
            ) : (
              <button onClick={handleUpgrade} className="btn-primary mt-7 w-full">
                Pro'ya yükselt <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feature comparison */}
        <div className="mt-12">
          <h2 className="mb-4 text-center font-display text-xl font-semibold text-white">Özellik Karşılaştırması</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left font-medium text-ink-200">Özellik</th>
                  <th className="px-4 py-3 text-center font-medium text-ink-200">Free</th>
                  <th className="px-4 py-3 text-center font-medium text-accent">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Bağlantılar', '10', 'Sınırsız'],
                  ['Projeler', '3', 'Sınırsız'],
                  ['Widgetlar', '3', 'Sınırsız'],
                  ['Medya deposu', '50 MB', '1 GB'],
                  ['Analitik geçmiş', '7 gün', '365 gün'],
                  ['Müzik parçaları', '1', 'Sınırsız'],
                  ['Temalar', 'Temel', 'Tümü'],
                  ['Düzenler', 'Temel', 'Tümü'],
                  ['Özel CSS', '—', '✓'],
                  ['Video arka plan', '—', '✓'],
                  ['Özel alan adı', '—', '✓'],
                  ['Marka kaldırma', '—', '✓'],
                  ['CSV dışa aktarım', '—', '✓'],
                  ['Öncelikli destek', '—', '✓'],
                ].map(([feat, free, pro]) => (
                  <tr key={feat} className="border-b border-white/[0.03] last:border-0">
                    <td className="px-4 py-2.5 text-ink-100">{feat}</td>
                    <td className="px-4 py-2.5 text-center text-ink-200">{free}</td>
                    <td className="px-4 py-2.5 text-center text-accent">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
