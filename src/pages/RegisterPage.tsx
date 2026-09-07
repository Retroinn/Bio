import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Link, useRouter } from '@/components/Router';
import { AuthLayout, Divider, OAuthButtons } from './AuthLayout';
import { Spinner } from '@/components/ui';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { RESERVED_USERNAMES, validateUsername } from '@/lib/utils';

export function RegisterPage() {
  const { navigate } = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    const v = validateUsername(username);
    if (!v.valid) {
      setUsernameStatus(username ? 'invalid' : 'idle');
      return;
    }
    setUsernameStatus('checking');
    const handle = setTimeout(async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('username', username);
      const reserved = RESERVED_USERNAMES.includes(username);
      setUsernameStatus(count || reserved ? 'taken' : 'available');
    }, 400);
    return () => clearTimeout(handle);
  }, [username]);

  const usernameState = (() => {
    if (usernameStatus === 'available') return { icon: <Check className="h-4 w-4 text-success" />, text: '✓ Kullanıcı adı uygun', color: 'text-success' };
    if (usernameStatus === 'taken') return { icon: <X className="h-4 w-4 text-danger" />, text: 'Bu kullanıcı adı kullanılıyor.', color: 'text-danger' };
    if (usernameStatus === 'invalid') return { icon: <X className="h-4 w-4 text-danger" />, text: validateUsername(username).reason ?? 'Geçersiz.', color: 'text-danger' };
    return null;
  })();

  const canContinue = usernameStatus === 'available';

  const createProfile = async (userId: string) => {
    const { error } = await supabase.from('profiles').insert({
      user_id: userId,
      username,
      display_name: username,
      bio: '',
    });
    if (error) throw error;
  };

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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      toast(error.message, 'error');
      return;
    }
    if (data.user) {
      try {
        await createProfile(data.user.id);
      } catch {
        // profile may already exist via trigger; ignore
      }
    }
    setLoading(false);
    toast('Hesap oluşturuldu. Giriş yapabilirsin.', 'success');
    navigate('/login');
  };

  const onOAuth = async (provider: 'google' | 'discord') => {
    if (!canContinue) {
      toast('Önce geçerli bir kullanıcı adı seç.', 'error');
      return;
    }
    setOauthLoading(provider);
    localStorage.setItem('bio_pending_username', username);
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
    <AuthLayout title="Hesap oluştur" subtitle="İki adımda kendi B.io profilini başlat.">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">Kullanıcı adı</label>
            <div className="relative">
              <input
                className="input pl-16"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="kullaniciadi"
                maxLength={20}
                autoFocus
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-300">b.io/</span>
              {usernameState && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${usernameState.color}`}>
                  {usernameState.icon}
                </span>
              )}
            </div>
            {usernameState && (
              <p className={`mt-2 text-xs ${usernameState.color}`}>{usernameState.text}</p>
            )}
            <p className="mt-2 text-xs text-ink-300">3-20 karakter, küçük harf, rakam ve alt çizgi.</p>
          </div>
          <button disabled={!canContinue} onClick={() => setStep(2)} className="btn-primary w-full">
            Devam et
          </button>
          <p className="text-center text-sm text-ink-200">
            Zaten hesabın var mı? <Link to="/login" className="text-accent hover:underline">Giriş yap</Link>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-300">Kullanıcı adı</span>
              <button onClick={() => setStep(1)} className="text-xs text-accent hover:underline">Düzenle</button>
            </div>
            <p className="mt-0.5 font-mono text-sm text-white">b.io/{username}</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">E-posta</label>
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad@ornek.com" required />
            </div>
            <div>
              <label className="label">Şifre</label>
              <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div>
              <label className="label">Şifre tekrar</label>
              <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : 'Devam et'}
            </button>
          </form>
          <Divider />
          <OAuthButtons onOAuth={onOAuth} />
        </div>
      )}
    </AuthLayout>
  );
}
