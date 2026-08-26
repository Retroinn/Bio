import { useEffect, useState } from 'react';
import { GripVertical, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Widget } from '@/lib/types';

const WIDGET_TYPES: Record<string, { label: string; description: string }> = {
  text: { label: 'Metin', description: 'Serbest metin bloğu' },
  image: { label: 'Görsel', description: 'Tek görsel göster' },
  video: { label: 'Video', description: 'Video oynatıcı' },
  youtube: { label: 'YouTube', description: 'YouTube videosu' },
  spotify: { label: 'Spotify', description: 'Spotify parçası veya çalma listesi' },
  github: { label: 'GitHub', description: 'GitHub depo kartı' },
  discord_server: { label: 'Discord Sunucu', description: 'Discord sunucu daveti' },
  countdown: { label: 'Geri sayım', description: 'Belirli bir tarihe geri sayım' },
  custom_link: { label: 'Özel Bağlantı', description: 'Özel bağlantı kartı' },
  project: { label: 'Proje', description: 'Proje kartı widget' },
};

export function WidgetsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const [editing, setEditing] = useState<Widget | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Widget | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('widgets').select('*').eq('profile_id', profile.id).order('position', { ascending: true });
    setWidgets((data as Widget[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const save = async (data: { type: string; config: Record<string, unknown>; is_visible: boolean }) => {
    if (editing) {
      const { error } = await supabase.from('widgets').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { toast('Güncellenemedi.', 'error'); return; }
      toast('Widget güncellendi.', 'success');
    } else {
      const position = widgets?.length ?? 0;
      const { error } = await supabase.from('widgets').insert({ profile_id: profile.id, ...data, position });
      if (error) { toast('Eklenemedi.', 'error'); return; }
      toast('Widget eklendi.', 'success');
    }
    setShowModal(false);
    await load();
  };

  const toggle = async (w: Widget) => {
    await supabase.from('widgets').update({ is_visible: !w.is_visible }).eq('id', w.id);
    await load();
  };

  const remove = async (w: Widget) => {
    const { error } = await supabase.from('widgets').delete().eq('id', w.id);
    if (error) { toast('Silinemedi.', 'error'); return; }
    toast('Widget silindi.', 'success');
    await load();
  };

  const reorder = async (from: number, to: number) => {
    if (!widgets || from === to) return;
    const next = [...widgets];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setWidgets(next);
    await Promise.all(next.map((w, i) => supabase.from('widgets').update({ position: i }).eq('id', w.id)));
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Widgetlar</h1>
          <p className="mt-1 text-sm text-ink-200">Profiline modüler widgetlar ekle.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Ekle</button>
      </div>

      {widgets === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : widgets.length === 0 ? (
        <EmptyState icon={<Wrench className="h-6 w-6" />} title="Henüz widget yok" description="Metin, görsel, YouTube, Spotify, Discord sunucu ve daha fazlasını ekle." action={<button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> İlk widgetını ekle</button>} />
      ) : (
        <div className="space-y-2.5">
          {widgets.map((w, index) => (
            <div key={w.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }} className="card group flex items-center gap-3 p-3.5">
              <GripVertical className="h-5 w-5 cursor-grab text-ink-300" />
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.04] text-accent"><Wrench className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{WIDGET_TYPES[w.type]?.label ?? w.type}</p>
                <p className="truncate text-xs text-ink-300">{(w.config.title as string) || (w.config.text as string) || w.type}</p>
              </div>
              <button onClick={() => toggle(w)} className={`chip ${w.is_visible ? 'border-success/30 text-success' : 'text-ink-300'}`}>{w.is_visible ? 'Görünür' : 'Gizli'}</button>
              <button onClick={() => { setEditing(w); setShowModal(true); }} className="text-ink-300 hover:text-white"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setDeleteTarget(w)} className="text-ink-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && <WidgetModal widget={editing} onClose={() => setShowModal(false)} onSave={save} />}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)} title="Widgetı sil" message="Bu widgetı silmek istediğine emin misin?" confirmLabel="Sil" danger />
    </DashboardLayout>
  );
}

function WidgetModal({ widget, onClose, onSave }: { widget: Widget | null; onClose: () => void; onSave: (data: { type: string; config: Record<string, unknown>; is_visible: boolean }) => void }) {
  const [type, setType] = useState(widget?.type ?? 'text');
  const [title, setTitle] = useState((widget?.config.title as string) ?? '');
  const [text, setText] = useState((widget?.config.text as string) ?? '');
  const [url, setUrl] = useState((widget?.config.url as string) ?? '');
  const [imageUrl, setImageUrl] = useState((widget?.config.image_url as string) ?? '');
  const [inviteUrl, setInviteUrl] = useState((widget?.config.invite_url as string) ?? '');
  const [serverName, setServerName] = useState((widget?.config.server_name as string) ?? '');
  const [targetDate, setTargetDate] = useState((widget?.config.target_date as string) ?? '');
  const [isVisible, setIsVisible] = useState(widget?.is_visible ?? true);
  const [saving, setSaving] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const config: Record<string, unknown> = {};
    if (title) config.title = title;
    if (text) config.text = text;
    if (url) config.url = url;
    if (imageUrl) config.image_url = imageUrl;
    if (inviteUrl) config.invite_url = inviteUrl;
    if (serverName) config.server_name = serverName;
    if (targetDate) config.target_date = targetDate;
    onSave({ type, config, is_visible: isVisible });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={widget ? 'Widgetı düzenle' : 'Yeni widget'} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Widget türü</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(WIDGET_TYPES).map(([k, v]) => <option key={k} value={k} className="bg-ink-900">{v.label} — {v.description}</option>)}
          </select>
        </div>
        {(type === 'text' || type === 'project' || type === 'custom_link') && (
          <div>
            <label className="label">Başlık</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}
        {type === 'text' && (
          <div>
            <label className="label">Metin</label>
            <textarea className="input min-h-[80px] resize-none" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        )}
        {(type === 'image' || type === 'project') && (
          <div>
            <label className="label">Görsel URL</label>
            <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}
        {(type === 'video' || type === 'youtube' || type === 'spotify' || type === 'custom_link' || type === 'github') && (
          <div>
            <label className="label">URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}
        {type === 'discord_server' && (
          <>
            <div>
              <label className="label">Sunucu adı</label>
              <input className="input" value={serverName} onChange={(e) => setServerName(e.target.value)} />
            </div>
            <div>
              <label className="label">Davet URL</label>
              <input className="input" value={inviteUrl} onChange={(e) => setInviteUrl(e.target.value)} placeholder="https://discord.gg/..." />
            </div>
          </>
        )}
        {type === 'countdown' && (
          <div>
            <label className="label">Hedef tarih</label>
            <input className="input" type="datetime-local" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-ink-100">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="accent-accent" />
          Görünür
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}
