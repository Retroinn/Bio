import { useState } from 'react';
import { Lock, Sparkles, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useEntitlements } from '@/lib/entitlements';
import { useToast } from '@/lib/toast';
import { useRouter } from '@/components/Router';

const FEATURE_INFO: Record<string, { name: string; description: string }> = {
  advanced_themes: { name: 'Gelişmiş Temalar', description: 'Cyber, Aurora, Obsidian, Neon, Glass ve daha fazlası.' },
  premium_layouts: { name: 'Premium Düzenler', description: 'Creator, Portfolio, Gamer, Glass Pro ve daha fazlası.' },
  custom_fonts: { name: 'Özel Fontlar', description: 'Genişletilmiş font kütüphanesinden seç.' },
  custom_css: { name: 'Özel CSS', description: 'Profil stilini tamamen özelleştir.' },
  advanced_backgrounds: { name: 'Gelişmiş Arka Planlar', description: 'Görsel, GIF, video ve animasyonlu arka planlar.' },
  video_background: { name: 'Video Arka Plan', description: 'Video arka plan kullan.' },
  advanced_effects: { name: 'Gelişmiş Efektler', description: 'Glow, blur, animasyonlu kenarlık ve daha fazlası.' },
  custom_cursor: { name: 'Özel İmleç', description: 'Profilinde özel imleç kullan.' },
  link_thumbnails: { name: 'Bağlantı Küçük Resimleri', description: 'Bağlantılara küçük resim ekle.' },
  scheduled_links: { name: 'Zamanlanmış Bağlantılar', description: 'Bağlantıları otomatik aktif/pasif et.' },
  advanced_widgets: { name: 'Gelişmiş Widgetlar', description: 'Discord Presence, Spotify, YouTube, GitHub widgetları.' },
  advanced_analytics: { name: 'Gelişmiş Analitik', description: '365 günlük geçmiş, ülke, cihaz ve kaynak analizi.' },
  analytics_export: { name: 'Analitik Dışa Aktarım', description: 'CSV olarak dışa aktar.' },
  custom_og_image: { name: 'Özel OG Görseli', description: 'Sosyal medya için özel görsel.' },
  custom_favicon: { name: 'Özel Favicon', description: 'Profilin için özel favicon.' },
  remove_branding: { name: 'B.io Markasını Kaldır', description: 'B.io markasını gizle.' },
  custom_domain: { name: 'Özel Alan Adı', description: 'Kendi alan adını bağla.' },
  pro_badge: { name: 'Pro Rozeti', description: 'Profilinde Pro rozeti göster.' },
  profile_templates: { name: 'Profil Şablonları', description: 'Hazır şablonları tek tıkla uygula.' },
  priority_support: { name: 'Öncelikli Destek', description: 'Öncelikli destek hattı.' },
};

export function UpgradeModal({
  open,
  onClose,
  featureKey,
}: {
  open: boolean;
  onClose: () => void;
  featureKey: string;
}) {
  const { plans } = useEntitlements();
  const { navigate } = useRouter();
  const toast = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const info = FEATURE_INFO[featureKey] ?? { name: 'Pro Özellik', description: 'Bu özellik Pro planında mevcuttur.' };
  const proPlan = plans.find((p) => p.slug === 'pro');
  const price = billingCycle === 'monthly' ? proPlan?.price_monthly : proPlan?.price_yearly;
  const yearlyMonthly = proPlan ? Math.round(proPlan.price_yearly / 12) : 0;

  const goToPricing = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Modal open={open} onClose={onClose} title="Pro Özellik" maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">{info.name}</h3>
            <p className="mt-1 text-sm text-ink-200">{info.description}</p>
          </div>
        </div>

        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4 text-accent" /> Pro Plan
            </span>
            <div className="flex gap-1 rounded-lg bg-white/[0.04] p-0.5">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-md px-2.5 py-1 text-xs transition ${billingCycle === 'monthly' ? 'bg-accent text-ink-950' : 'text-ink-200'}`}
              >Aylık</button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`rounded-md px-2.5 py-1 text-xs transition ${billingCycle === 'yearly' ? 'bg-accent text-ink-950' : 'text-ink-200'}`}
              >Yıllık</button>
            </div>
          </div>
          {price !== undefined && (
            <p className="font-display text-3xl font-bold text-white">
              ₺{price.toLocaleString('tr-TR')}
              <span className="text-base font-normal text-ink-300">
                {billingCycle === 'monthly' ? '/ay' : '/yıl'}
              </span>
            </p>
          )}
          {billingCycle === 'yearly' && yearlyMonthly > 0 && (
            <p className="mt-1 text-xs text-accent">≈ ₺{yearlyMonthly.toLocaleString('tr-TR')}/ay — yıllıkta tasarruf</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={goToPricing} className="btn-primary w-full">
            Pro'ya yükselt
          </button>
          <button onClick={onClose} className="btn-ghost w-full">
            Free ile devam et
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function useUpgradeGate() {
  const { can } = useEntitlements();
  const [gatedFeature, setGatedFeature] = useState<string | null>(null);
  const toast = useToast();

  const gate = (featureKey: string): boolean => {
    if (can(featureKey)) return true;
    setGatedFeature(featureKey);
    return false;
  };

  const modal = gatedFeature ? (
    <UpgradeModal open={!!gatedFeature} onClose={() => setGatedFeature(null)} featureKey={gatedFeature} />
  ) : null;

  return { gate, modal };
}
