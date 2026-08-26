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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id);
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
          await loadProfile(userId);
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
    if (session?.user?.id) await loadProfile(session.user.id);
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
