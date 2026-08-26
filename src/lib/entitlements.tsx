import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FeatureEntitlement, Plan, Subscription } from '@/lib/types';

type EntitlementsContextValue = {
  planSlug: string;
  isPro: boolean;
  subscription: Subscription | null;
  plans: Plan[];
  loading: boolean;
  can: (featureKey: string) => boolean;
  getLimit: (featureKey: string) => number | null;
  checkFeature: (featureKey: string) => Promise<FeatureEntitlement>;
  refresh: () => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsContextValue | undefined>(undefined);

export const FREE_DEFAULTS: Record<string, { enabled: boolean; limit: number | null }> = {
  basic_profile: { enabled: true, limit: null },
  basic_avatar: { enabled: true, limit: null },
  basic_bio: { enabled: true, limit: null },
  social_links: { enabled: true, limit: 20 },
  custom_links: { enabled: true, limit: 10 },
  basic_themes: { enabled: true, limit: null },
  basic_layouts: { enabled: true, limit: null },
  projects: { enabled: true, limit: 3 },
  basic_analytics: { enabled: true, limit: null },
  analytics_history: { enabled: true, limit: 7 },
  discord_connection: { enabled: true, limit: null },
  qr_code: { enabled: true, limit: null },
  media_storage: { enabled: true, limit: 50 },
  widgets: { enabled: true, limit: 3 },
  music_player: { enabled: true, limit: 1 },
  basic_seo: { enabled: true, limit: null },
  remove_branding: { enabled: false, limit: null },
  custom_domain: { enabled: false, limit: null },
  advanced_themes: { enabled: false, limit: null },
  premium_layouts: { enabled: false, limit: null },
  custom_fonts: { enabled: false, limit: null },
  custom_css: { enabled: false, limit: null },
  advanced_backgrounds: { enabled: false, limit: null },
  video_background: { enabled: false, limit: null },
  advanced_effects: { enabled: false, limit: null },
  custom_cursor: { enabled: false, limit: null },
  link_thumbnails: { enabled: false, limit: null },
  scheduled_links: { enabled: false, limit: null },
  advanced_widgets: { enabled: false, limit: null },
  advanced_analytics: { enabled: false, limit: null },
  analytics_export: { enabled: false, limit: null },
  custom_og_image: { enabled: false, limit: null },
  custom_favicon: { enabled: false, limit: null },
  pro_badge: { enabled: false, limit: null },
  profile_templates: { enabled: false, limit: null },
  priority_support: { enabled: false, limit: null },
};

export function EntitlementsProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [planSlug, setPlanSlug] = useState<string>('free');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [plansRes] = await Promise.all([
      supabase.from('plans').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);
    setPlans((plansRes.data as Plan[]) ?? []);

    if (!userId) {
      setPlanSlug('free');
      setSubscription(null);
      setLoading(false);
      return;
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (sub && ((sub as Subscription).status === 'active' || (sub as Subscription).status === 'trialing')) {
      const s = sub as Subscription;
      const expired = s.current_period_end && new Date(s.current_period_end) < new Date();
      if (!expired) {
        setSubscription(s);
        const { data: plan } = await supabase.from('plans').select('slug').eq('id', s.plan_id).maybeSingle();
        setPlanSlug((plan as { slug: string } | null)?.slug ?? 'free');
        setLoading(false);
        return;
      }
    }
    setSubscription(null);
    setPlanSlug('free');
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const can = useCallback(
    (featureKey: string) => {
      if (planSlug === 'pro') return true;
      const def = FREE_DEFAULTS[featureKey];
      return def?.enabled ?? false;
    },
    [planSlug],
  );

  const getLimit = useCallback(
    (featureKey: string): number | null => {
      if (planSlug === 'pro') return null;
      const def = FREE_DEFAULTS[featureKey];
      return def?.limit ?? null;
    },
    [planSlug],
  );

  const checkFeature = useCallback(
    async (featureKey: string): Promise<FeatureEntitlement> => {
      if (!userId) {
        const def = FREE_DEFAULTS[featureKey];
        return { enabled: def?.enabled ?? false, limit: def?.limit ?? null, planSlug: 'free' };
      }
      const { data, error } = await supabase.rpc('check_feature', {
        feature_key: featureKey,
        user_uid: userId,
      });
      if (error || !data || (data as unknown[]).length === 0) {
        const def = FREE_DEFAULTS[featureKey];
        return { enabled: def?.enabled ?? false, limit: def?.limit ?? null, planSlug: 'free' };
      }
      const row = (data as Array<{ enabled: boolean; limit_value: number | null; plan_slug: string }>)[0];
      return { enabled: row.enabled, limit: row.limit_value, planSlug: row.plan_slug };
    },
    [userId],
  );

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      planSlug,
      isPro: planSlug === 'pro',
      subscription,
      plans,
      loading,
      can,
      getLimit,
      checkFeature,
      refresh: loadAll,
    }),
    [planSlug, subscription, plans, loading, can, getLimit, checkFeature, loadAll],
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return ctx;
}
