import { useEffect, useState } from 'react';
import { GripVertical, Music, Pencil, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { isSafeUrl, normalizeUrl } from '@/lib/utils';
import type { MusicTrack } from '@/lib/types';

export function MusicPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [tracks, setTracks] = useState<MusicTrack[] | null>(null);
  const [editing, setEditing] = useState<MusicTrack | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MusicTrack | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('music_tracks').select('*').eq('profile_id', profile.id).order('position', { ascending: true });
    setTracks((data as MusicTrack[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const save = async (data: { title: string; artist: string; audio_url: string; cover_url: string }) => {
    const audio_url = normalizeUrl(data.audio_url);
    if (!isSafeUrl(audio_url)) { toast('Geçersiz ses URL.', 'error'); return; }
    const cover_url = data.cover_url ? normalizeUrl(data.cover_url) : '';
    if (cover_url && !isSafeUrl(cover_url)) { toast('Geçersiz kapak URL.', 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('music_tracks').update({ ...data, audio_url, cover_url: cover_url || null }).eq('id', editing.id);
      if (error) { toast('Güncellenemedi.', 'error'); return; }
      toast('Parça güncellendi.', 'success');
    } else {
      const position = tracks?.length ?? 0;
      const { error } = await supabase.from('music_tracks').insert({ profile_id: profile.id, ...data, audio_url, cover_url: cover_url || null, position });
      if (error) { toast('Eklenemedi.', 'error'); return; }
      toast('Parça eklendi.', 'success');
    }
    setShowModal(false);
    await load();
  };

  const toggle = async (t: MusicTrack) => {
    await supabase.from('music_tracks').update({ is_active: !t.is_active }).eq('id', t.id);
    await load();
  };

  const remove = async (t: MusicTrack) => {
    const { error } = await supabase.from('music_tracks').delete().eq('id', t.id);
    if (error) { toast('Silinemedi.', 'error'); return; }
    toast('Silindi.', 'success');
    await load();
  };

  const reorder = async (from: number, to: number) => {
    if (!tracks || from === to) return;
    const next = [...tracks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTracks(next);
    await Promise.all(next.map((t, i) => supabase.from('music_tracks').update({ position: i }).eq('id', t.id)));
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Müzik</h1>
          <p className="mt-1 text-sm text-ink-200">Profiline müzik çalar ekle.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Ekle</button>
      </div>

      {tracks === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : tracks.length === 0 ? (
        <EmptyState icon={<Music className="h-6 w-6" />} title="Henüz parça yok" description="Ses URL'si ekle — ziyaretçilerin profilinde dinlesin." action={<button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> İlk parçayı ekle</button>} />
      ) : (
        <div className="space-y-2.5">
          {tracks.map((t, index) => (
            <div key={t.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }} className="card group flex items-center gap-3 p-3.5">
              <GripVertical className="h-5 w-5 cursor-grab text-ink-300" />
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-white/[0.04]">
                {t.cover_url ? <img src={t.cover_url} alt="" className="h-full w-full object-cover" /> : <Music className="h-4 w-4 text-accent" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{t.title}</p>
                <p className="truncate text-xs text-ink-300">{t.artist}</p>
              </div>
              <button onClick={() => toggle(t)} className={`chip ${t.is_active ? 'border-success/30 text-success' : 'text-ink-300'}`}>{t.is_active ? 'Aktif' : 'Pasif'}</button>
              <button onClick={() => { setEditing(t); setShowModal(true); }} className="text-ink-300 hover:text-white"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setDeleteTarget(t)} className="text-ink-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && <TrackModal track={editing} onClose={() => setShowModal(false)} onSave={save} />}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)} title="Parçayı sil" message="Bu parçayı silmek istediğine emin misin?" confirmLabel="Sil" danger />
    </DashboardLayout>
  );
}

function TrackModal({ track, onClose, onSave }: { track: MusicTrack | null; onClose: () => void; onSave: (data: { title: string; artist: string; audio_url: string; cover_url: string }) => void }) {
  const [title, setTitle] = useState(track?.title ?? '');
  const [artist, setArtist] = useState(track?.artist ?? '');
  const [audioUrl, setAudioUrl] = useState(track?.audio_url ?? '');
  const [coverUrl, setCoverUrl] = useState(track?.cover_url ?? '');
  const [saving, setSaving] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({ title, artist, audio_url: audioUrl, cover_url: coverUrl });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={track ? 'Parçayı düzenle' : 'Yeni parça'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Başlık</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Sanatçı</label>
          <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} />
        </div>
        <div>
          <label className="label">Ses URL</label>
          <input className="input" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://...mp3" required />
        </div>
        <div>
          <label className="label">Kapak URL (opsiyonel)</label>
          <input className="input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}
