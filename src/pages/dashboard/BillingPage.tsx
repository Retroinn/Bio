import { useEffect, useState } from 'react';
import { CreditCard, Calendar, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog } from '@/components/Modal';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlements';
import { useToast } from '@/lib/toast';
import { Link, useRouter } from '@/components/Router';
import { supabase } from '@/lib/supabase';
import type { Subscription } from '@/lib/types';

export function BillingPage() {
  const { user } = useAuth();
  const { planSlug, isPro, subscription, plans, refresh } = useEntitlements();
  const toast = useToast();
  const { navigate } = useRouter();
  const [sub, setSub] = useState<Subscription | null>(subscription);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
      setSub((data as Subscription | null) ?? null);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <DashboardLayout><div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div></DashboardLayout>;

  const proPlan = plans.find((p) => p.slug === 'pro');
  const freePlan = plans.find((p) => p.slug === 'free');

  const cancelSubscription = async () => {
    if (!sub) return;
    setCanceling(true);
    // In production, this would call the payment provider's API via an edge function.
    // For now, update cancel_at_period_end directly (manual provider).
    const { error } = await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    setCanceling(false);
    if (error) { toast('İptal edilemedi.', 'error'); return; }
    toast('Abonelik dönem sonunda iptal edilecek.', 'success');
    await refresh();
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user!.id).maybeSingle();
    setSub((data as Subscription | null) ?? null);
  };

  const resumeSubscription = async () => {
    if (!sub) return;
    const { error } = await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    if (error) { toast('Devam ettirilemedi.', 'error'); return; }
    toast('Abonelik devam ettirildi.', 'success');
    await refresh();
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user!.id).maybeSingle();
    setSub((data as Subscription | null) ?? null);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Faturalama</h1>
        <p className="mt-1 text-sm text-ink-200">Abonelik ve fatura bilgilerin.</p>
      </div>

      {/* Current plan */}
      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-ink-200">Mevcut plan</span>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              {isPro ? 'Pro' : 'Free'}
            </h2>
            {sub && sub.status === 'active' && (
              <p className="mt-1 text-sm text-ink-200">
                {sub.billing_cycle === 'yearly' ? 'Yıllık' : 'Aylık'} faturalama
              </p>
            )}
          </div>
          <span className={`chip ${isPro ? 'border-accent/40 bg-accent/10 text-accent' : 'text-ink-200'}`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>

        {sub && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <span className="flex items-center gap-2 text-sm text-ink-100">
                <Calendar className="h-4 w-4 text-ink-300" /> Dönem başlangıcı
              </span>
              <span className="text-sm text-white">
                {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString('tr-TR') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <span className="flex items-center gap-2 text-sm text-ink-100">
                <Calendar className="h-4 w-4 text-ink-300" /> Dönem bitişi
              </span>
              <span className="text-sm text-white">
                {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('tr-TR') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <span className="flex items-center gap-2 text-sm text-ink-100">
                <CreditCard className="h-4 w-4 text-ink-300" /> Durum
              </span>
              <span className={`text-sm ${sub.cancel_at_period_end ? 'text-warning' : 'text-success'}`}>
                {sub.cancel_at_period_end ? 'Dönem sonunda iptal' : 'Aktif'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {!isPro && (
            <Link to="/pricing" className="btn-primary">
              Pro'ya yükselt
            </Link>
          )}
          {isPro && sub && !sub.cancel_at_period_end && (
            <button onClick={() => setShowCancel(true)} className="btn-outline">
              <X className="h-4 w-4" /> Aboneliği iptal et
            </button>
          )}
          {isPro && sub && sub.cancel_at_period_end && (
            <button onClick={resumeSubscription} className="btn-primary">
              <RefreshCw className="h-4 w-4" /> Devam ettir
            </button>
          )}
        </div>
      </div>

      {/* Plan comparison */}
      <div className="card p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-white">Plan karşılaştırması</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-xl border p-4 ${planSlug === 'free' ? 'border-accent/30 bg-accent/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <p className="font-display text-sm font-semibold text-white">Free</p>
            <p className="mt-1 text-2xl font-bold text-white">₺0<span className="text-sm font-normal text-ink-300">/ay</span></p>
            <p className="mt-2 text-xs text-ink-300">Temel profil, 10 bağlantı, 3 proje</p>
          </div>
          <div className={`rounded-xl border p-4 ${planSlug === 'pro' ? 'border-accent/30 bg-accent/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <p className="font-display text-sm font-semibold text-white">Pro</p>
            <p className="mt-1 text-2xl font-bold text-white">
              ₺{proPlan?.price_monthly.toLocaleString('tr-TR') ?? '—'}<span className="text-sm font-normal text-ink-300">/ay</span>
            </p>
            <p className="mt-2 text-xs text-ink-300">Sınırsız, gelişmiş tüm özellikler</p>
          </div>
        </div>
      </div>

      {/* Payment provider notice */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" />
        <div>
          <p className="text-sm text-ink-100">Ödeme sağlayıcı henüz yapılandırılmamış.</p>
          <p className="mt-1 text-xs text-ink-300">
            Stripe veya iyzico entegrasyonu hazır olduğunda, bu sayfadan gerçek ödeme yapabileceksin.
            Mevcut mimari ödeme sağlayıcıya bağlanmaya hazır şekilde tasarlanmıştır.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={cancelSubscription}
        title="Aboneliği iptal et"
        message="Aboneliğin dönem sonunda iptal edilecek. O zamana kadar Pro özelliklerini kullanmaya devam edebilirsin."
        confirmLabel="İptal et"
        danger
      />
    </DashboardLayout>
  );
}
