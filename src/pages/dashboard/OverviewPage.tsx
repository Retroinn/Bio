import { useEffect, useState } from 'react';
import { BarChart3, Copy, Eye, Link as LinkIcon, MousePointerClick, QrCode, Share2 } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { StatCard } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { copyToClipboard, formatNumber } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export function OverviewPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [clicks, setClicks] = useState<number | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const profileUrl = profile ? `${window.location.origin}/${profile.username}` : '';

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .in('event_type', ['link_click', 'social_click', 'project_click'])
      .then(({ count }) => setClicks(count ?? 0));
  }, [profile]);

  const ctr = profile && clicks !== null && profile.profile_views > 0
    ? ((clicks / profile.profile_views) * 100).toFixed(1)
    : '0.0';

  const copyUrl = async () => {
    try {
      await copyToClipboard(profileUrl);
      toast('Profil bağlantısı kopyalandı.', 'success');
    } catch {
      toast('Kopyalanamadı.', 'error');
    }
  };

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-200">Profil yükleniyor...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Genel Bakış</h1>
        <p className="mt-1 text-sm text-ink-200">Profilinin özeti ve hızlı işlemler.</p>
      </div>

      {/* Profile URL card */}
      <div className="card mb-6 p-5">
        <span className="text-xs uppercase tracking-wider text-ink-200">Profil adresin</span>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-lg text-white">{profileUrl}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`/${profile.username}`} className="btn-outline text-xs">Profili gör</a>
            <button onClick={copyUrl} className="btn-outline text-xs"><Copy className="h-3.5 w-3.5" /> Kopyala</button>
            <button onClick={() => setShowShare(true)} className="btn-outline text-xs"><Share2 className="h-3.5 w-3.5" /> Paylaş</button>
            <button onClick={() => setShowQR(true)} className="btn-outline text-xs"><QrCode className="h-3.5 w-3.5" /> QR</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Görüntülenme" value={formatNumber(profile.profile_views)} icon={<Eye className="h-4 w-4" />} hint="Toplam profil ziyareti" />
        <StatCard label="Tıklama" value={clicks !== null ? formatNumber(clicks) : '—'} icon={<MousePointerClick className="h-4 w-4" />} hint="Bağlantı ve sosyal tıklamaları" />
        <StatCard label="CTR" value={`%${ctr}`} icon={<BarChart3 className="h-4 w-4" />} hint="Tıklama / görüntülenme" />
      </div>

      {/* Quick links */}
      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-white">Hızlı işlemler</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: 'Profilini düzenle', d: 'Ad, bio, avatar', to: '/dashboard/profile', icon: LinkIcon },
            { t: 'Bağlantı ekle', d: 'Yeni link ekle', to: '/dashboard/links', icon: LinkIcon },
            { t: 'Görünüm değiştir', d: 'Tema ve renkler', to: '/dashboard/appearance', icon: LinkIcon },
          ].map((q) => (
            <a key={q.t} href={q.to} className="card group flex items-center gap-3 p-4 transition hover:border-accent/20">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
                <q.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{q.t}</p>
                <p className="text-xs text-ink-300">{q.d}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <Modal open={showQR} onClose={() => setShowQR(false)} title="Profil QR Kodu" maxWidth="max-w-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSvg value={profileUrl} size={200} />
          </div>
          <p className="text-sm text-ink-200">Profilini paylaşmak için tara.</p>
          <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(profileUrl)}`} download="bio-qr.png" className="btn-primary w-full">PNG indir</a>
        </div>
      </Modal>

      <Modal open={showShare} onClose={() => setShowShare(false)} title="Profilini paylaş" maxWidth="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-ink-200">Aşağıdaki bağlantıyı kopyala ve paylaş:</p>
          <div className="rounded-lg border border-white/[0.08] bg-ink-900/60 p-3 font-mono text-xs text-accent break-all">
            {profileUrl}
          </div>
          <button onClick={copyUrl} className="btn-primary w-full"><Copy className="h-4 w-4" /> Bağlantıyı kopyala</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// Inline QR generator using the public API as image source fallback
function QRCodeSvg({ value, size }: { value: string; size: number }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`}
      alt="QR kod"
      width={size}
      height={size}
    />
  );
}
