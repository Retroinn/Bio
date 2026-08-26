import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { checkUsernameAvailable, updateProfile } from '@/lib/profile-service';
import { initials, validateUsername } from '@/lib/utils';
import type { Profile } from '@/lib/types';

const AVATAR_MAX = 2 * 1024 * 1024;
const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ProfileEditorPage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<Profile | null>(profile);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  useEffect(() => {
    if (!form || !profile) return;
    if (form.username === profile.username) {
      setUsernameStatus('idle');
      return;
    }
    const v = validateUsername(form.username);
    if (!v.valid) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      const ok = await checkUsernameAvailable(form.username, profile.user_id);
      setUsernameStatus(ok ? 'available' : 'taken');
    }, 400);
    return () => clearTimeout(handle);
  }, [form?.username, profile]);

  if (!form || !profile) {
    return (
      <DashboardLayout>
        <div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div>
      </DashboardLayout>
    );
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const uploadAvatar = async (file: File) => {
    if (file.size > AVATAR_MAX) { toast('Avatar 2MB\'dan küçük olmalı.', 'error'); return; }
    if (!AVATAR_MIME.includes(file.type)) { toast('Sadece JPG, PNG, WebP, GIF.', 'error'); return; }
    setUploadingAvatar(true);
    setAvatarError(false);
    try {
      const path = `${profile.user_id}/avatar-${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) { toast('Avatar yüklenemedi.', 'error'); return; }
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      await supabase.from('media').insert({
        profile_id: profile.id,
        type: 'avatar',
        storage_path: path,
        url: pub.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });
      set('avatar_url', pub.publicUrl);
      toast('Avatar yüklendi. Kaydetmeyi unutma.', 'success');
    } catch {
      toast('Avatar yüklenemedi.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      toast('Kullanıcı adı uygun değil.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        username: form.username,
        display_name: form.display_name,
        bio: form.bio,
        location: form.location,
        website: form.website,
        status_text: form.status_text,
        avatar_url: form.avatar_url,
        banner_url: form.banner_url,
      });
      await refreshProfile();
      toast('Profil güncellendi.', 'success');
    } catch (err) {
      toast('Profil güncellenemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const usernameState = (() => {
    if (usernameStatus === 'available') return { icon: <Check className="h-4 w-4 text-success" />, text: 'Kullanıcı adı uygun', color: 'text-success' };
    if (usernameStatus === 'taken') return { icon: <X className="h-4 w-4 text-danger" />, text: 'Bu kullanıcı adı kullanılıyor.', color: 'text-danger' };
    if (usernameStatus === 'invalid') return { icon: <X className="h-4 w-4 text-danger" />, text: validateUsername(form.username).reason ?? 'Geçersiz.', color: 'text-danger' };
    return null;
  })();

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Profil</h1>
          <p className="mt-1 text-sm text-ink-200">Prolini düzenle — değişiklikler canlı önizlemede görünür.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Spinner /> : 'Kaydet'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Editor */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-white">Kimlik</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-deep p-0.5">
                  <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-ink-900 font-display font-bold text-accent">
                    {form.avatar_url && !avatarError ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" onError={() => setAvatarError(true)} /> : initials(form.display_name || form.username)}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="label">Avatar</label>
                  <div className="flex gap-2">
                    <input className="input" value={form.avatar_url ?? ''} onChange={(e) => { set('avatar_url', e.target.value || null); setAvatarError(false); }} placeholder="https://..." />
                    <button onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar} className="btn-outline shrink-0">
                      {uploadingAvatar ? <Spinner /> : <Upload className="h-4 w-4" />}
                    </button>
                    <input ref={avatarRef} type="file" accept={AVATAR_MIME.join(',')} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }} />
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Görünen ad</label>
                <input className="input" value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="Adın" />
              </div>
              <div>
                <label className="label">Kullanıcı adı</label>
                <div className="relative">
                  <input
                    className="input pl-16"
                    value={form.username}
                    onChange={(e) => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-300">b.io/</span>
                  {usernameState && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${usernameState.color}`}>{usernameState.icon}</span>
                  )}
                </div>
                {usernameState && <p className={`mt-1.5 text-xs ${usernameState.color}`}>{usernameState.text}</p>}
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea className="input min-h-[88px] resize-none" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Kendinden bahset..." maxLength={240} />
                <p className="mt-1 text-right text-xs text-ink-300">{form.bio.length}/240</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-white">Ek bilgiler</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Durum</label>
                <input className="input" value={form.status_text ?? ''} onChange={(e) => set('status_text', e.target.value || null)} placeholder="Ne yapıyorsun?" />
              </div>
              <div>
                <label className="label">Konum</label>
                <input className="input" value={form.location ?? ''} onChange={(e) => set('location', e.target.value || null)} placeholder="Şehir, ülke" />
              </div>
              <div>
                <label className="label">Web sitesi</label>
                <input className="input" value={form.website ?? ''} onChange={(e) => set('website', e.target.value || null)} placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-300">Canlı önizleme</p>
          <div className="card p-5">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-deep p-0.5">
                <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-ink-900 font-display font-bold text-accent">
                  {form.avatar_url && !avatarError ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" onError={() => setAvatarError(true)} /> : initials(form.display_name || form.username)}
                </div>
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-white">{form.display_name || form.username}</h3>
              <p className="text-xs text-accent">@{form.username}</p>
              {form.status_text && <p className="mt-1 text-xs text-ink-200">{form.status_text}</p>}
              {form.bio && <p className="mt-2 text-sm text-ink-100">{form.bio}</p>}
              {form.location && <p className="mt-2 text-xs text-ink-300">{form.location}</p>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
