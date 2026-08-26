import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, Globe, MousePointerClick, Smartphone } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/lib/utils';
import type { AnalyticsEvent } from '@/lib/types';

const RANGES = [
  { id: 7, label: '7 gün' },
  { id: 30, label: '30 gün' },
  { id: 90, label: '90 gün' },
];

export function AnalyticsPage() {
  const { profile } = useAuth();
  const [range, setRange] = useState(7);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('analytics_events')
      .select('*')
      .eq('profile_id', profile.id)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setEvents((data as AnalyticsEvent[]) ?? []);
        setLoading(false);
      });
  }, [profile?.id, range]);

  const stats = useMemo(() => {
    const views = events.filter((e) => e.event_type === 'profile_view').length;
    const clicks = events.filter((e) => ['link_click', 'social_click', 'project_click'].includes(e.event_type)).length;
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    return { views, clicks, ctr: ctr.toFixed(1) };
  }, [events]);

  const byDay = useMemo(() => {
    const days: Record<string, { views: number; clicks: number }> = {};
    events.forEach((e) => {
      const d = new Date(e.created_at).toISOString().slice(0, 10);
      if (!days[d]) days[d] = { views: 0, clicks: 0 };
      if (e.event_type === 'profile_view') days[d].views++;
      else days[d].clicks++;
    });
    return Object.entries(days).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  const byDevice = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => { const d = e.device ?? 'unknown'; counts[d] = (counts[d] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [events]);

  const byReferrer = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => { const r = e.referrer || 'direct'; counts[r] = (counts[r] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [events]);

  const topLinks = useMemo(() => {
    const counts: Record<string, number> = {};
    events.filter((e) => e.event_type === 'link_click' && e.link_id).forEach((e) => { counts[e.link_id!] = (counts[e.link_id!] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [events]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const maxDay = Math.max(...byDay.map(([, v]) => Math.max(v.views, v.clicks)), 1);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Analitik</h1>
          <p className="mt-1 text-sm text-ink-200">Gizlilik dostu metrikler — IP saklamadan.</p>
        </div>
        <div className="flex gap-1.5 rounded-lg border border-white/[0.08] bg-ink-900/60 p-1">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={`rounded-md px-3 py-1.5 text-xs transition ${range === r.id ? 'bg-accent text-ink-950' : 'text-ink-200 hover:text-white'}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Görüntülenme" value={formatNumber(stats.views)} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Tıklama" value={formatNumber(stats.clicks)} icon={<MousePointerClick className="h-4 w-4" />} />
        <StatCard label="CTR" value={`%${stats.ctr}`} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {/* Chart */}
      <div className="card mt-6 p-5">
        <h3 className="mb-4 font-display text-base font-semibold text-white">Zaman içinde</h3>
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-white/[0.03]" />
        ) : byDay.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-300">Bu dönemde veri yok.</p>
        ) : (
          <div className="flex h-48 items-end gap-1">
            {byDay.map(([day, v]) => (
              <div key={day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full max-w-[24px] flex-col justify-end gap-0.5" style={{ height: '160px' }}>
                  <div className="w-full rounded-t bg-accent/60 transition-all" style={{ height: `${(v.views / maxDay) * 100}%` }} title={`${v.views} görüntülenme`} />
                  <div className="w-full rounded-t bg-white/20 transition-all" style={{ height: `${(v.clicks / maxDay) * 100}%` }} title={`${v.clicks} tıklama`} />
                </div>
                <span className="text-[9px] text-ink-300">{day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-4 text-xs text-ink-200">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent/60" /> Görüntülenme</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/20" /> Tıklama</span>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <BreakdownCard title="Cihaz" icon={<Smartphone className="h-4 w-4" />} items={byDevice} />
        <BreakdownCard title="Kaynak" icon={<Globe className="h-4 w-4" />} items={byReferrer} />
        <BreakdownCard title="En çok tıklanan bağlantılar" icon={<MousePointerClick className="h-4 w-4" />} items={topLinks.map(([id, c]) => [id.slice(0, 8), c] as [string, number])} />
      </div>
    </DashboardLayout>
  );
}

function BreakdownCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: [string, number][] }) {
  const max = Math.max(...items.map(([, c]) => c), 1);
  return (
    <div className="card p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">{icon} {title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-ink-300">Veri yok.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map(([label, count]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate text-ink-100">{label}</span>
                <span className="text-ink-300">{count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div className="h-full rounded-full bg-accent/50" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
