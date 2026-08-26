import { useEffect, useState } from 'react';
import { GripVertical, Link2, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlements';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { isSafeUrl, normalizeUrl } from '@/lib/utils';
import { UpgradeModal } from '@/components/UpgradeModal';
import type { Link } from '@/lib/types';

export function LinksPage() {
  const { profile } = useAuth();
  const { can, getLimit, isPro } = useEntitlements();
  const toast = useToast();
  const [links, setLinks] = useState<Link[] | null>(null);
  const [editing, setEditing] = useState<Link | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Link | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [gatedFeature, setGatedFeature] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('links')
      .select('*')
      .eq('profile_id', profile.id)
      .order('position', { ascending: true });
    setLinks((data as Link[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const openAdd = () => {
    const limit = getLimit('custom_links');
    if (!isPro && limit !== null && (links?.length ?? 0) >= limit) {
      setGatedFeature('custom_links');
      return;
    }
    setEditing(null);
    setShowModal(true);
  };
  const openEdit = (link: Link) => {
    setEditing(link);
    setShowModal(true);
  };

  const save = async (data: { title: string; description: string; url: string; icon: string }) => {
    const url = normalizeUrl(data.url);
    if (!isSafeUrl(url)) {
      toast('Geçersiz URL. Sadece http/https bağlantıları kabul edilir.', 'error');
      return;
    }
    if (editing) {
      const { error } = await supabase.from('links').update({ ...data, url, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { toast('Güncellenemedi.', 'error'); return; }
      toast('Bağlantı güncellendi.', 'success');
    } else {
      const position = (links?.length ?? 0);
      const { error } = await supabase.from('links').insert({ profile_id: profile.id, ...data, url, position });
      if (error) { toast('Eklenemedi.', 'error'); return; }
      toast('Bağlantı eklendi.', 'success');
    }
    setShowModal(false);
    await load();
  };

  const toggle = async (link: Link) => {
    await supabase.from('links').update({ is_active: !link.is_active }).eq('id', link.id);
    await load();
  };

  const remove = async (link: Link) => {
    const { error } = await supabase.from('links').delete().eq('id', link.id);
    if (error) { toast('Silinemedi.', 'error'); return; }
    toast('Bağlantı silindi.', 'success');
    await load();
  };

  const reorder = async (from: number, to: number) => {
    if (!links || from === to) return;
    const next = [...links];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLinks(next);
    const updates = next.map((l, i) => supabase.from('links').update({ position: i }).eq('id', l.id));
    await Promise.all(updates);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Bağlantılar</h1>
          <p className="mt-1 text-sm text-ink-200">Profilindeki özel bağlantıları yönet.</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Ekle</button>
      </div>

      {!isPro && links !== null && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-ink-200">
          <span>{links.length} / {getLimit('custom_links') ?? '∞'} bağlantı</span>
          <button onClick={() => setGatedFeature('custom_links')} className="text-accent hover:underline">Pro'ya yükselt →</button>
        </div>
      )}

      {links === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-6 w-6" />}
          title="Henüz bağlantı yok"
          description="İlk bağlantını ekleyerek başla — portföy sitesi, bülten, mağaza bağlantısı ne istersen."
          action={<button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> İlk bağlantını ekle</button>}
        />
      ) : (
        <div className="space-y-2.5">
          {links.map((link, index) => (
            <div
              key={link.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }}
              className="card group flex items-center gap-3 p-3.5"
            >
              <GripVertical className="h-5 w-5 cursor-grab text-ink-300" />
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.04] text-accent">
                <Link2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{link.title}</p>
                <p className="truncate text-xs text-ink-300">{link.url}</p>
              </div>
              <button onClick={() => toggle(link)} className={`chip ${link.is_active ? 'border-success/30 text-success' : 'text-ink-300'}`}>
                {link.is_active ? 'Aktif' : 'Pasif'}
              </button>
              <button onClick={() => openEdit(link)} className="text-ink-300 transition hover:text-white"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setDeleteTarget(link)} className="text-ink-300 transition hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <LinkModal
          link={editing}
          onClose={() => setShowModal(false)}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove(deleteTarget)}
        title="Bağlantıyı sil"
        message="Bu bağlantıyı silmek istediğine emin misin?"
        confirmLabel="Sil"
        danger
      />

      {gatedFeature && <UpgradeModal open={!!gatedFeature} onClose={() => setGatedFeature(null)} featureKey={gatedFeature} />}
    </DashboardLayout>
  );
}

function LinkModal({
  link, onClose, onSave,
}: {
  link: Link | null;
  onClose: () => void;
  onSave: (data: { title: string; description: string; url: string; icon: string }) => void;
}) {
  const [title, setTitle] = useState(link?.title ?? '');
  const [description, setDescription] = useState(link?.description ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [saving, setSaving] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({ title, description, url, icon: 'link' });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={link ? 'Bağlantıyı düzenle' : 'Yeni bağlantı'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Başlık</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bağlantı başlığı" required />
        </div>
        <div>
          <label className="label">Açıklama</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kısa açıklama (opsiyonel)" />
        </div>
        <div>
          <label className="label">URL</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ornek.com" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}
