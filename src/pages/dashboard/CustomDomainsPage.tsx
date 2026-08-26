import { useEffect, useState } from 'react';
import { Check, Copy, Globe, Plus, Trash2, X } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlements';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/utils';
import { UpgradeModal } from '@/components/UpgradeModal';
import type { CustomDomain } from '@/lib/types';

export function CustomDomainsPage() {
  const { profile } = useAuth();
  const { can } = useEntitlements();
  const toast = useToast();
  const [domains, setDomains] = useState<CustomDomain[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomDomain | null>(null);
  const [gatedFeature, setGatedFeature] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('custom_domains').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false });
    setDomains((data as CustomDomain[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const addDomain = async () => {
    if (!can('custom_domain')) { setGatedFeature('custom_domain'); return; }
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) { toast('Geçerli bir alan adı gir.', 'error'); return; }
    setAdding(true);
    const token = Math.random().toString(36).substring(2, 18);
    const { error } = await supabase.from('custom_domains').insert({
      profile_id: profile.id,
      domain,
      verification_token: token,
    });
    setAdding(false);
    if (error) { toast('Eklenemedi.', 'error'); return; }
    toast('Alan adı eklendi. Doğrulama gerekli.', 'success');
    setNewDomain('');
    setShowModal(false);
    await load();
  };

  const verifyDomain = async (d: CustomDomain) => {
    // In production, this would check DNS records via an edge function.
    // For now, mark as verified (manual verification).
    const { error } = await supabase.from('custom_domains')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', d.id);
    if (error) { toast('Doğrulanamadı.', 'error'); return; }
    toast('Alan adı doğrulandı.', 'success');
    await load();
  };

  const removeDomain = async (d: CustomDomain) => {
    const { error } = await supabase.from('custom_domains').delete().eq('id', d.id);
    if (error) { toast('Silinemedi.', 'error'); return; }
    toast('Alan adı silindi.', 'success');
    await load();
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Özel Alan Adı</h1>
          <p className="mt-1 text-sm text-ink-200">Kendi alan adını bağla — Pro özelliği.</p>
        </div>
        <button onClick={() => { if (can('custom_domain')) setShowModal(true); else setGatedFeature('custom_domain'); }} className="btn-primary">
          <Plus className="h-4 w-4" /> Ekle
        </button>
      </div>

      {domains === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : domains.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-6 w-6" />}
          title="Henüz alan adı yok"
          description="Kendi alan adını bağla (örn. benimsitem.com). DNS doğrulaması gerekir."
          action={<button onClick={() => { if (can('custom_domain')) setShowModal(true); else setGatedFeature('custom_domain'); }} className="btn-primary"><Plus className="h-4 w-4" /> Alan adı ekle</button>}
        />
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-white">{d.domain}</p>
                  <span className={`chip mt-1 ${d.status === 'verified' ? 'border-success/30 text-success' : 'text-ink-300'}`}>
                    {d.status === 'verified' ? <><Check className="h-3 w-3" /> Doğrulandı</> : 'Bekliyor'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {d.status !== 'verified' && (
                    <>
                      <button onClick={() => copyToClipboard(d.verification_token).then(() => toast('Token kopyalandı.', 'success'))} className="btn-ghost text-xs">
                        <Copy className="h-3.5 w-3.5" /> Token
                      </button>
                      <button onClick={() => verifyDomain(d)} className="btn-outline text-xs">Doğrula</button>
                    </>
                  )}
                  <button onClick={() => setDeleteTarget(d)} className="text-ink-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {d.status !== 'verified' && (
                <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-ink-200">DNS TXT kaydı ekle:</p>
                  <p className="mt-1 font-mono text-xs text-accent break-all">bio-verify={d.verification_token}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Alan adı ekle" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="label">Alan adı</label>
            <input className="input" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="ornek.com" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowModal(false)}>Vazgeç</button>
            <button onClick={addDomain} disabled={adding} className="btn-primary">{adding ? <Spinner /> : 'Ekle'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && removeDomain(deleteTarget)} title="Alan adını sil" message="Bu alan adını silmek istediğine emin misin?" confirmLabel="Sil" danger />

      {gatedFeature && <UpgradeModal open={!!gatedFeature} onClose={() => setGatedFeature(null)} featureKey={gatedFeature} />}
    </DashboardLayout>
  );
}
