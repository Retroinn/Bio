import { useState } from 'react';
import { Link, useRouter } from '@/components/Router';
import { AuthLayout, Divider, OAuthButtons } from './AuthLayout';
import { Spinner } from '@/components/ui';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const { navigate } = useRouter();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast('E-posta veya şifre hatalı.', 'error');
      return;
    }
    await refreshProfile();
    toast('Giriş yapıldı.', 'success');
    navigate('/dashboard');
  };

  const onOAuth = async (provider: 'google' | 'discord') => {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setOauthLoading(null);
      toast(error.message || 'OAuth başlatılamadı.', 'error');
    }
  };

  return (
    <AuthLayout title="Hesabına giriş yap" subtitle="B.io profiline geri dön.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">E-posta</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad@ornek.com" required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Şifre</label>
            <Link to="/forgot-password" className="text-xs text-accent hover:underline">Şifremi unuttum</Link>
          </div>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner /> : 'Giriş yap'}
        </button>
      </form>

      <Divider />
      <OAuthButtons onOAuth={onOAuth} />

      <p className="mt-6 text-center text-sm text-ink-200">
        Hesabın yok mu? <Link to="/register" className="text-accent hover:underline">Hesap oluştur</Link>
      </p>
    </AuthLayout>
  );
}
