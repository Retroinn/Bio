import { useEffect, useState } from 'react';
import { Disc3, Link2, Unlink } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog } from '@/components/Modal';
import { Spinner } from '@/components/ui';
import { SocialIcon } from '@/components/SocialIcon';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { DiscordConnection } from '@/lib/types';

export function DiscordPage() {
  const { profile, user, session, refreshProfile } = useAuth();
  const toast = useToast();
  const [connection, setConnection] = useState<DiscordConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDisconnect, setShowDisconnect] = useState(false);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase.from('discord_connections').select('*').eq('profile_id', profile.id).maybeSingle();
    setConnection((data as DiscordConnection | null) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  useEffect(() => {
    if (!user || !profile) return;
    const discordIdentity = user.identities?.find((id) => id.provider === 'discord');
    if (!discordIdentity) return;
    (async () => {
      const { data: existing } = await supabase.from('discord_connections').select('id').eq('profile_id', profile.id).maybeSingle();
      if (existing) return;

      const meta = discordIdentity.identity_data ?? {};
      const discordUsername = (meta.full_name as string) || (meta.name as string) || (meta.preferred_username as string) || 'discord_user';
      const discordUserId = discordIdentity.id;
      const avatarUrl = (meta.avatar_url as string) || null;

      const { error } = await supabase.from('discord_connections').insert({
        profile_id: profile.id,
        discord_user_id: discordUserId,
        discord_username: discordUsername,
        display_name: discordUsername,
        avatar_url: avatarUrl,
      });

      if (!error) {
        toast('Discord bağlandı.', 'success');
        await load();
      }
    })();
  }, [user, profile, toast]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const connectDiscord = async () => {
    if (!user || !session) {
      toast('Discord bağlamak için giriş yapmalısın.', 'error');
      return;
    }
    const { error } = await supabase.auth.linkIdentity({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/dashboard/discord`,
        scopes: 'identify',
      },
    });
    if (error) toast(error.message || 'Discord bağlantısı başlatılamadı.', 'error');
  };

  const disconnect = async () => {
    if (!connection) return;
    const { error } = await supabase.from('discord_connections').delete().eq('id', connection.id);
    if (error) { toast('Bağlantı kesilemedi.', 'error'); return; }
    toast('Discord bağlantısı kesildi.', 'success');
    await load();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Discord</h1>
        <p className="mt-1 text-sm text-ink-200">Discord hesabını bağla — opsiyonel bir entegrasyondur.</p>
      </div>

      {loading ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : connection ? (
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-[#5865F2]/20">
              {connection.avatar_url ? <img src={connection.avatar_url} alt="" className="h-full w-full object-cover" /> : <SocialIcon platform="discord" size={28} className="text-[#5865F2]" />}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-white">{connection.display_name || connection.discord_username}</h3>
              <p className="text-sm text-ink-300">@{connection.discord_username}</p>
            </div>
            <span className="chip border-success/30 text-success">Bağlı</span>
          </div>

          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="mb-2 text-sm font-medium text-white">Discord Etkinliği</h4>
            <p className="text-xs text-ink-300">
              Discord OAuth2 <code className="text-accent">identify</code> kapsamı yalnızca kimlik bilgilerini sağlar; canlı oyun etkinliği bu kapsamın dışındadır.
              Etkinlik verisi Discord tarafından sağlanmadığı sürece profilinde etkinlik bölümü gizlenir.
            </p>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={connectDiscord} className="btn-outline"><Link2 className="h-4 w-4" /> Yeniden bağla</button>
            <button onClick={() => setShowDisconnect(true)} className="btn-danger"><Unlink className="h-4 w-4" /> Bağlantıyı kes</button>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#5865F2]/15">
            <SocialIcon platform="discord" size={28} className="text-[#5865F2]" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white">Discord hesabını bağla</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-200">
            Discord kullanıcı adını ve avatarını profilinde göster. Sadece <code className="text-accent">identify</code> kapsamı istenir — canlı etkinlik verisi Discord tarafından sağlanmadıkça gösterilmez.
          </p>
          <button onClick={connectDiscord} className="btn-primary mx-auto mt-6">
            <Disc3 className="h-4 w-4" /> Discord'a bağlan
          </button>
        </div>
      )}

      <ConfirmDialog open={showDisconnect} onClose={() => setShowDisconnect(false)} onConfirm={disconnect} title="Discord bağlantısını kes" message="Discord bağlantını kesmek istediğine emin misin?" confirmLabel="Kes" danger />
    </DashboardLayout>
  );
}
