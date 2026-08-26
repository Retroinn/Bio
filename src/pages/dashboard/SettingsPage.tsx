import { useEffect, useState } from 'react';
import { KeyRound, Mail, Shield, Trash2 } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { Spinner, Toggle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@/lib/profile-service';
import { useRouter } from '@/components/Router';

export function SettingsPage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const [privacy, setPrivacy] = useState({
    is_public: true,
    show_location: true,
    show_discord: true,
    show_activity: true,
    show_socials: true,
    show_projects: true,
    show_music: true,
    show_media: true,
  });

  useEffect(() => {
    if (profile) {
      setPrivacy({
        is_public: profile.is_public,
        show_location: profile.show_location,
        show_discord: profile.show_discord,
        show_activity: profile.show_activity,
        show_socials: profile.show_socials,
        show_projects: profile.show_projects,
        show_music: profile.show_music,
        show_media: profile.show_media,
      });
    }
  }, [profile]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const savePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      await updateProfile(profile.id, privacy);
      await refreshProfile();
      toast('Gizlilik ayarları kaydedildi.', 'success');
    } catch {
      toast('Kaydedilemedi.', 'error');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== profile.username) { toast(`"${profile.username}" yazmalısın.`, 'error'); return; }
    setDeleting(true);
    try {
      await supabase.from('profiles').delete().eq('id', profile.id);
      const { error } = await supabase.auth.admin?.deleteUser(user?.id ?? '') ?? {};
      if (error) throw error;
      await signOut();
      toast('Hesap silindi.', 'success');
      navigate('/');
    } catch {
      toast('Hesap silinemedi. Lütfen destekle iletişime geç.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Ayarlar</h1>
        <p className="mt-1 text-sm text-ink-200">Hesap, güvenlik ve gizlilik ayarları.</p>
      </div>

      {/* Account */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-white">Hesap</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div>
              <p className="text-sm font-medium text-white">E-posta</p>
              <p className="text-xs text-ink-300">{user?.email}</p>
            </div>
            <button onClick={() => setShowEmailModal(true)} className="btn-outline text-xs"><Mail className="h-3.5 w-3.5" /> Değiştir</button>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div>
              <p className="text-sm font-medium text-white">Şifre</p>
              <p className="text-xs text-ink-300">Düzenli değiştir önerilir</p>
            </div>
            <button onClick={() => setShowPasswordModal(true)} className="btn-outline text-xs"><KeyRound className="h-3.5 w-3.5" /> Değiştir</button>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="card mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white"><Shield className="h-4 w-4 text-accent" /> Gizlilik</h2>
          <button onClick={savePrivacy} disabled={savingPrivacy} className="btn-primary text-xs">{savingPrivacy ? <Spinner /> : 'Kaydet'}</button>
        </div>
        <div className="space-y-4">
          <Toggle checked={privacy.is_public} onChange={(v) => setPrivacy((p) => ({ ...p, is_public: v }))} label="Herkese açık profil" description="Kapalı olduğunda profilin sadece senin tarafından görülür." />
          <Toggle checked={privacy.show_location} onChange={(v) => setPrivacy((p) => ({ ...p, show_location: v }))} label="Konumu göster" />
          <Toggle checked={privacy.show_discord} onChange={(v) => setPrivacy((p) => ({ ...p, show_discord: v }))} label="Discord'u göster" />
          <Toggle checked={privacy.show_activity} onChange={(v) => setPrivacy((p) => ({ ...p, show_activity: v }))} label="Etkinliği göster" />
          <Toggle checked={privacy.show_socials} onChange={(v) => setPrivacy((p) => ({ ...p, show_socials: v }))} label="Sosyal hesapları göster" />
          <Toggle checked={privacy.show_projects} onChange={(v) => setPrivacy((p) => ({ ...p, show_projects: v }))} label="Projeleri göster" />
          <Toggle checked={privacy.show_music} onChange={(v) => setPrivacy((p) => ({ ...p, show_music: v }))} label="Müziği göster" />
          <Toggle checked={privacy.show_media} onChange={(v) => setPrivacy((p) => ({ ...p, show_media: v }))} label="Medyayı göster" />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-danger/20 p-6">
        <h2 className="mb-1 font-display text-base font-semibold text-danger">Tehlikeli Bölge</h2>
        <p className="mb-4 text-sm text-ink-200">Hesabını ve tüm profil verilerini kalıcı olarak sil.</p>
        <button onClick={() => setShowDelete(true)} className="btn-danger"><Trash2 className="h-4 w-4" /> Hesabı sil</button>
      </div>

      {/* Delete modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Hesabı sil" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-ink-100">Bu işlem geri alınamaz. Profilin, bağlantıların, projelerin ve tüm verilerin kalıcı olarak silinecek.</p>
          <p className="text-sm text-ink-100">Onaylamak için <code className="text-danger">{profile.username}</code> yaz.</p>
          <input className="input" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={profile.username} />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowDelete(false)}>Vazgeç</button>
            <button onClick={deleteAccount} disabled={deleting} className="btn-danger">{deleting ? <Spinner /> : 'Kalıcı olarak sil'}</button>
          </div>
        </div>
      </Modal>

      {/* Password modal */}
      <PasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <EmailModal open={showEmailModal} onClose={() => setShowEmailModal(false)} currentEmail={user?.email ?? ''} />
    </DashboardLayout>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast('Şifre en az 6 karakter olmalı.', 'error'); return; }
    if (password !== confirm) { toast('Şifreler eşleşmiyor.', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { toast('Şifre güncellenemedi.', 'error'); return; }
    toast('Şifre güncellendi.', 'success');
    setPassword(''); setConfirm('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Şifre değiştir">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Yeni şifre</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <div><label className="label">Yeni şifre tekrar</label><input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button><button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Güncelle'}</button></div>
      </form>
    </Modal>
  );
}

function EmailModal({ open, onClose, currentEmail }: { open: boolean; onClose: () => void; currentEmail: string }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || email === currentEmail) { toast('Yeni bir e-posta gir.', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSaving(false);
    if (error) { toast('E-posta güncellenemedi.', 'error'); return; }
    toast('Onay e-postası gönderildi.', 'success');
    setEmail('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="E-posta değiştir">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Yeni e-posta</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <p className="text-xs text-ink-300">Yeni e-posta adresine onay bağlantısı gönderilecek.</p>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button><button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Gönder'}</button></div>
      </form>
    </Modal>
  );
}
