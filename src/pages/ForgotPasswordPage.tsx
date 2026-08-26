import { useState } from 'react';
import { Link, useRouter } from '@/components/Router';
import { AuthLayout } from './AuthLayout';
import { Spinner } from '@/components/ui';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast('Sıfırlama bağlantısı gönderilemedi.', 'error');
      return;
    }
    setSent(true);
    toast('Sıfırlama bağlantısı gönderildi.', 'success');
  };

  return (
    <AuthLayout title="Şifremi unuttum" subtitle="E-postana gir, sıfırlama bağlantısı gönderelim.">
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-ink-100">
            <strong className="text-white">{email}</strong> adresine sıfırlama bağlantısı gönderdik.
          </p>
          <Link to="/login" className="btn-outline w-full">Girişe dön</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">E-posta</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad@ornek.com" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner /> : 'Sıfırlama bağlantısı gönder'}
          </button>
          <p className="text-center text-sm text-ink-200">
            <Link to="/login" className="text-accent hover:underline">Girişe dön</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { navigate } = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast('Şifre en az 6 karakter olmalı.', 'error');
      return;
    }
    if (password !== confirm) {
      toast('Şifreler eşleşmiyor.', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast('Şifre güncellenemedi.', 'error');
      return;
    }
    toast('Şifre güncellendi.', 'success');
    navigate('/login');
  };

  return (
    <AuthLayout title="Yeni şifre belirle" subtitle="Yeni şifreni gir ve kaydet.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Yeni şifre</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <div>
          <label className="label">Yeni şifre tekrar</label>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner /> : 'Şifreyi güncelle'}
        </button>
      </form>
    </AuthLayout>
  );
}
