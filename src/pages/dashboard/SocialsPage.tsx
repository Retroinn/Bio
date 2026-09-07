import { useEffect, useState } from 'react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { SocialIcon } from '@/components/SocialIcon';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { isSafeUrl, normalizeUrl } from '@/lib/utils';
import type { SocialLink } from '@/lib/types';

const PLATFORMS: Record<string, { label: string; prefix: string }> = {
  instagram: { label: 'Instagram', prefix: 'https://instagram.com/' },
  tiktok: { label: 'TikTok', prefix: 'https://tiktok.com/@' },
  youtube: { label: 'YouTube', prefix: 'https://youtube.com/@' },
  x: { label: 'X', prefix: 'https://x.com/' },
  github: { label: 'GitHub', prefix: 'https://github.com/' },
  twitch: { label: 'Twitch', prefix: 'https://twitch.tv/' },
  spotify: { label: 'Spotify', prefix: 'https://open.spotify.com/' },
  steam: { label: 'Steam', prefix: 'https://steamcommunity.com/id/' },
  reddit: { label: 'Reddit', prefix: 'https://reddit.com/u/' },
  telegram: { label: 'Telegram', prefix: 'https://t.me/' },
  discord: { label: 'Discord', prefix: 'https://discord.gg/' },
  linkedin: { label: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
  facebook: { label: 'Facebook', prefix: 'https://facebook.com/' },
  snapchat: { label: 'Snapchat', prefix: 'https://snapchat.com/add/' },
  roblox: { label: 'Roblox', prefix: 'https://roblox.com/user.aspx?username=' },
  custom: { label: 'Özel URL', prefix: '' },
};

export function SocialsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [socials, setSocials] = useState<SocialLink[] | null>(null);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SocialLink | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('social_links').select('*').eq('profile_id', profile.id).order('position', { ascending: true });
    setSocials((data as SocialLink[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const save = async (data: { platform: string; username: string; url: string }) => {
    const url = normalizeUrl(data.url);
    if (!isSafeUrl(url)) { toast('Geçersiz URL.', 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('social_links').update({ ...data, url, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { toast('Güncellenemedi.', 'error'); return; }
      toast('Sosyal hesap güncellendi.', 'success');
    } else {
      const position = socials?.length ?? 0;
      const { error } = await supabase.from('social_links').insert({ profile_id: profile.id, ...data, url, icon: data.platform });
      if (error) { toast('Eklenemedi.', 'error'); return; }
      toast('Sosyal hesap eklendi.', 'success');
    }
    setShowModal(false);
    await load();
  };

  const toggle = async (s: SocialLink) => {
    await supabase.from('social_links').update({ is_active: !s.is_active }).eq('id', s.id);
    await load();
  };

  const remove = async (s: SocialLink) => {
    const { error } = await supabase.from('social_links').delete().eq('id', s.id);
    if (error) { toast('Silinemedi.', 'error'); return; }
    toast('Silindi.', 'success');
    await load();
  };

  const reorder = async (from: number, to: number) => {
    if (!socials || from === to) return;
    const next = [...socials];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSocials(next);
    await Promise.all(next.map((s, i) => supabase.from('social_links').update({ position: i }).eq('id', s.id)));
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Sosyal Hesaplar</h1>
          <p className="mt-1 text-sm text-ink-200">Sosyal medya hesaplarını ekle ve sırala.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Ekle</button>
      </div>

      {socials === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : socials.length === 0 ? (
        <EmptyState icon={<Plus className="h-6 w-6" />} title="Henüz sosyal hesap yok" description="Instagram, GitHub, X ve daha fazlasını ekle." action={<button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Ekle</button>} />
      ) : (
        <div className="space-y-2.5">
          {socials.map((s, index) => (
            <div key={s.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }} className="card group flex items-center gap-3 p-3.5">
              <GripVertical className="h-5 w-5 cursor-grab text-ink-300" />
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.04] text-accent"><SocialIcon platform={s.platform} size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{PLATFORMS[s.platform]?.label ?? s.platform}</p>
                <p className="truncate text-xs text-ink-300">{s.username || s.url}</p>
              </div>
              <button onClick={() => toggle(s)} className={`chip ${s.is_active ? 'border-success/30 text-success' : 'text-ink-300'}`}>{s.is_active ? 'Aktif' : 'Pasif'}</button>
              <button onClick={() => { setEditing(s); setShowModal(true); }} className="text-ink-300 hover:text-white"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setDeleteTarget(s)} className="text-ink-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && <SocialModal social={editing} onClose={() => setShowModal(false)} onSave={save} />}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)} title="Hesabı sil" message="Bu sosyal hesabı silmek istediğine emin misin?" confirmLabel="Sil" danger />
    </DashboardLayout>
  );
}

function SocialModal({ social, onClose, onSave }: { social: SocialLink | null; onClose: () => void; onSave: (data: { platform: string; username: string; url: string }) => void }) {
  const [platform, setPlatform] = useState(social?.platform ?? 'instagram');
  const [username, setUsername] = useState(social?.username ?? '');
  const [url, setUrl] = useState(social?.url ?? '');
  const [saving, setSaving] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({ platform, username, url: url || `${PLATFORMS[platform].prefix}${username}` });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={social ? 'Hesabı düzenle' : 'Yeni sosyal hesap'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Platform</label>
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k} className="bg-ink-900">{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Kullanıcı adı</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullaniciadi" />
        </div>
        <div>
          <label className="label">URL (boş bırakırsan otomatik oluşturulur)</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={PLATFORMS[platform].prefix} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}
