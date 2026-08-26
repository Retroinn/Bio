import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { MediaItem } from '@/lib/types';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

export function MediaPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('media').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false });
    setMedia((data as MediaItem[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile || !user) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const upload = async (file: File) => {
    if (file.size > MAX_SIZE) { toast('Dosya 5MB\'dan küçük olmalı.', 'error'); return; }
    if (!ALLOWED_MIME.includes(file.type)) { toast('Sadece JPG, PNG, WebP, GIF, SVG.', 'error'); return; }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) { toast('Geçersiz dosya uzantısı.', 'error'); return; }

    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const { error: upErr } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) { toast('Yüklenemedi.', 'error'); setUploading(false); return; }

    const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
    const { error: dbErr } = await supabase.from('media').insert({
      profile_id: profile.id,
      type: 'image',
      storage_path: path,
      url: pub.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });
    if (dbErr) { toast('Kaydedilemedi.', 'error'); setUploading(false); return; }
    toast('Görsel yüklendi.', 'success');
    setUploading(false);
    await load();
  };

  const remove = async (m: MediaItem) => {
    await supabase.storage.from('media').remove([m.storage_path]);
    const { error } = await supabase.from('media').delete().eq('id', m.id);
    if (error) { toast('Silinemedi.', 'error'); return; }
    toast('Silindi.', 'success');
    await load();
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Medya</h1>
          <p className="mt-1 text-sm text-ink-200">Görsellerini Supabase Storage'da yönet.</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary">
          {uploading ? <Spinner /> : <><Upload className="h-4 w-4" /> Yükle</>}
        </button>
        <input ref={fileRef} type="file" accept={ALLOWED_MIME.join(',')} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>

      {media === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : media.length === 0 ? (
        <EmptyState icon={<ImageIcon className="h-6 w-6" />} title="Henüz medya yok" description="Görsel yükle — avatar, banner, proje görseli olarak kullan." action={<button onClick={() => fileRef.current?.click()} className="btn-primary"><Upload className="h-4 w-4" /> Yükle</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="card group relative overflow-hidden">
              <div className="aspect-square overflow-hidden">
                <img src={m.url} alt={m.file_name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-2">
                <p className="truncate text-xs text-ink-100">{m.file_name}</p>
                <p className="text-[10px] text-ink-300">{(m.file_size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => setDeleteTarget(m)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-black/60 text-ink-100 opacity-0 transition group-hover:opacity-100 hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)} title="Medyayı sil" message="Bu görsel kalıcı olarak silinecek." confirmLabel="Sil" danger />
    </DashboardLayout>
  );
}
