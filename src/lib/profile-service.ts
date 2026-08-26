import { supabase } from '@/lib/supabase';
import type { Link, Profile, ProfileUpdate, Project, SocialLink, Widget } from '@/lib/types';

export async function getPublicProfile(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getProfileContent(profileId: string) {
  const [links, socials, projects, widgets] = await Promise.all([
    supabase.from('links').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
    supabase.from('social_links').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
    supabase.from('projects').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
    supabase.from('widgets').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
  ]);
  return {
    links: links.data as Link[] | null,
    socials: socials.data as SocialLink[] | null,
    projects: projects.data as Project[] | null,
    widgets: widgets.data as Widget[] | null,
  };
}

export async function updateProfile(id: string, patch: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function checkUsernameAvailable(username: string, excludeUserId?: string) {
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('username', username);
  if (excludeUserId) {
    const { data: own } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .maybeSingle();
    if (own?.user_id === excludeUserId) return true;
  }
  return (count ?? 0) === 0;
}

export async function recordProfileView(profileId: string) {
  const { error } = await supabase.rpc('increment_profile_views', { profile_id: profileId });
  if (error) {
    // Fallback: direct update (may fail under RLS for anon; ignore)
    await supabase.from('analytics_events').insert({
      profile_id: profileId,
      event_type: 'profile_view',
    });
  }
}

export async function recordLinkClick(profileId: string, linkId: string, eventType: string) {
  await supabase.from('analytics_events').insert({
    profile_id: profileId,
    link_id: linkId,
    event_type: eventType,
  });
}
