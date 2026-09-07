import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { EntitlementsProvider } from '@/lib/entitlements';
import type { Profile } from '@/lib/types';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function generateUsername(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 14) || 'user';
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${cleaned}_${suffix}`;
}

async function ensureProfile(user: User): Promise<Profile | null> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) return existing as Profile;

  const meta = user.user_metadata ?? {};
  let username = (meta.username as string) || (meta.preferred_username as string) || (meta.name as string) || (user.email?.split('@')[0]) || 'user';
  username = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (!username || username.length < 3) username = 'user';

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? username : generateUsername(username);
    const { data: conflict } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    if (!conflict) {
      username = candidate;
      break;
    }
  }

  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null;
  const displayName = (meta.full_name as string) || (meta.name as string) || username;

  const insert: Record<string, unknown> = {
    user_id: user.id,
    username,
    display_name: displayName,
    bio: '',
    avatar_url: avatarUrl,
    banner_url: null,
    location: null,
    website: null,
    status_text: null,
    is_public: true,
    show_location: true,
    show_discord: true,
    show_activity: true,
    show_socials: true,
    show_projects: true,
    show_music: true,
    show_media: true,
    theme_id: 'dark',
    layout_id: 'classic',
    plan: 'free',
    custom_css: '',
    remove_branding: false,
    show_pro_badge: false,
    custom_font: '',
    background_type: 'none',
    background_config: {},
    accent_color: '',
    seo_title: null,
    seo_description: null,
    seo_image: null,
    seo_indexable: true,
  };

  const { data: created, error } = await supabase
    .from('profiles')
    .insert(insert)
    .select()
    .maybeSingle();

  if (error) {
    const { data: retry } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    return (retry as Profile | null) ?? null;
  }

  return (created as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, user?: User) => {
    if (user) {
      const p = await ensureProfile(user);
      setProfile(p);
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setProfile((data as Profile | null) ?? null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id, data.session.user);
      }
      if (mounted) setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      (async () => {
        setSession(nextSession);
        const userId = nextSession?.user?.id;
        if (userId) {
          await loadProfile(userId, nextSession!.user);
          if (mounted) setLoading(false);
        } else {
          setProfile(null);
        }
        if (event === 'SIGNED_OUT') setProfile(null);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user?.id) await loadProfile(session.user.id, session.user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, profile, loading, refreshProfile, signOut }),
    [session, profile, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      <EntitlementsProvider userId={session?.user?.id ?? null}>
        {children}
      </EntitlementsProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
