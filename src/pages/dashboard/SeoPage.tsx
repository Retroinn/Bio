import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { Spinner, Toggle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { updateProfile } from '@/lib/profile-service';

export function SeoPage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoImage, setSeoImage] = useState('');
  const [indexable, setIndexable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setSeoTitle(profile.seo_title ?? '');
      setSeoDescription(profile.seo_description ?? '');
      setSeoImage(profile.seo_image ?? '');
      setIndexable(profile.seo_indexable);
    }
  }, [profile]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        seo_image: seoImage || null,
        seo_indexable: indexable,
      });
      await refreshProfile();
      toast('SEO ayarları kaydedildi.', 'success');
    } catch {
      toast('Kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewTitle = seoTitle || `${profile.display_name || profile.username} — B.io`;
  const previewDesc = seoDescription || profile.bio || `b.io/${profile.username} profilini ziyaret et.`;

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">SEO</h1>
          <p className="mt-1 text-sm text-ink-200">Arama motoru ve sosyal medya meta verilerini düzenle.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Kaydet'}</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-white">Meta veriler</h2>
            <div className="space-y-4">
              <div>
                <label className="label">SEO başlığı</label>
                <input className="input" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={`${profile.display_name} — B.io`} maxLength={60} />
                <p className="mt-1 text-right text-xs text-ink-300">{seoTitle.length}/60</p>
              </div>
              <div>
                <label className="label">SEO açıklaması</label>
                <textarea className="input min-h-[80px] resize-none" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Profilinin arama sonuçlarında görünecek açıklaması" maxLength={160} />
                <p className="mt-1 text-right text-xs text-ink-300">{seoDescription.length}/160</p>
              </div>
              <div>
                <label className="label">OG görsel URL</label>
                <input className="input" value={seoImage} onChange={(e) => setSeoImage(e.target.value)} placeholder="https://..." />
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <Toggle checked={indexable} onChange={setIndexable} label="Arama motoru indeksleme" description="Kapalı olduğunda noindex etiketi eklenir." />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-300">Arama motoru önizleme</p>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs text-ink-300">
              <Search className="h-3.5 w-3.5" />
              <span className="truncate">b.io/{profile.username}</span>
            </div>
            <p className="mt-1 text-base text-[#8ab4f8]">{previewTitle}</p>
            <p className="mt-0.5 text-sm text-ink-200 line-clamp-2">{previewDesc}</p>
          </div>
          <p className="mt-2 mb-2 text-xs uppercase tracking-wider text-ink-300">Sosyal medya önizleme</p>
          <div className="card overflow-hidden">
            {seoImage ? (
              <div className="aspect-video overflow-hidden bg-white/[0.04]">
                <img src={seoImage} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="grid aspect-video place-items-center bg-white/[0.02] text-xs text-ink-300">OG görsel yok</div>
            )}
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-ink-300">B.io</p>
              <p className="truncate text-sm font-medium text-white">{previewTitle}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-200">{previewDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
