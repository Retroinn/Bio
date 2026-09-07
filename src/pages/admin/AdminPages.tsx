import { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, CheckCircle2, Image as ImageIcon, Loader2, ShieldAlert, Users } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { supabase } from '@/lib/supabase';

type JsonRow = Record<string, unknown>;

function useAdminRpc<T>(fn: string, args?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const result = await supabase.rpc(fn, args);
      if (!active) return;
      if (result.error) setError('Veriler yüklenemedi.');
      else setData(result.data as T);
    })();
    return () => { active = false; };
  }, [fn, JSON.stringify(args)]);
  return { data, error };
}

function PageShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <AdminLayout><div className="mb-8"><h1 className="font-display text-2xl font-bold text-white">{title}</h1><p className="mt-1 text-sm text-ink-200">{description}</p></div>{children}</AdminLayout>;
}

function ResultState({ error }: { error: string | null }) {
  if (error) return <div className="card flex items-center gap-3 p-5 text-sm text-danger"><AlertCircle className="h-5 w-5" />{error}</div>;
  return <div className="card flex items-center justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
}

function DataTable({ rows, columns }: { rows: JsonRow[]; columns: Array<{ key: string; label: string }> }) {
  if (rows.length === 0) return <div className="card p-8 text-center text-sm text-ink-200">Kayıt bulunamadı.</div>;
  return <div className="card overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-white/[0.06]">{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-ink-300">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-b border-white/[0.04] last:border-0"><>{columns.map((column) => <td key={column.key} className="max-w-[260px] truncate px-4 py-3 text-ink-100">{renderCell(column, row[column.key])}</td>)}</></tr>)}</tbody></table></div>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderCell(column: { key: string }, value: unknown): React.ReactNode {
  if (column.key === 'avatar_url' && typeof value === 'string' && value !== '') {
    return <img src={value} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  if (column.key === 'created_at' && typeof value === 'string') {
    return new Date(value).toLocaleDateString('tr-TR');
  }
  return formatValue(value);
}

export function AdminOverviewPage() {
  const result = useAdminRpc<JsonRow>('admin_get_stats');
  if (!result.data) return <PageShell title="Genel Bakış" description="B.io platform özeti."><ResultState error={result.error} /></PageShell>;
  const entries = Object.entries(result.data);
  return <PageShell title="Genel Bakış" description="B.io platform özeti."><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{entries.map(([key, value]) => <div key={key} className="card p-5"><p className="text-xs uppercase tracking-wider text-ink-300">{key.replace(/_/g, ' ')}</p><p className="mt-2 font-display text-2xl font-bold text-white">{formatValue(value)}</p></div>)}</div></PageShell>;
}

export function AdminUsersPage() {
  const result = useAdminRpc<JsonRow[]>('admin_get_users');
  return <PageShell title="Kullanıcılar" description="Platform kullanıcılarını ve profil durumlarını görüntüle.">{result.data ? <DataTable rows={result.data} columns={[{ key: 'avatar_url', label: 'Avatar' }, { key: 'email', label: 'E-posta' }, { key: 'username', label: 'Kullanıcı adı' }, { key: 'display_name', label: 'Ad' }, { key: 'plan_slug', label: 'Plan' }, { key: 'sub_status', label: 'Abonelik' }, { key: 'is_banned', label: 'Yasaklı' }, { key: 'created_at', label: 'Kayıt' }]} /> : <ResultState error={result.error} />}</PageShell>;
}

export function AdminSubscriptionsPage() {
  const result = useAdminRpc<JsonRow[]>('admin_get_subscriptions');
  return <PageShell title="Pro / Abonelikler" description="Aktif ve geçmiş abonelik kayıtları.">{result.data ? <DataTable rows={result.data} columns={[{ key: 'user_email', label: 'E-posta' }, { key: 'username', label: 'Profil' }, { key: 'plan_name', label: 'Plan' }, { key: 'status', label: 'Durum' }, { key: 'billing_cycle', label: 'Dönem' }, { key: 'provider', label: 'Sağlayıcı' }]} /> : <ResultState error={result.error} />}</PageShell>;
}

export function AdminReportsPage() {
  const result = useAdminRpc<JsonRow[]>('admin_get_reports');
  return <PageShell title="Raporlar" description="Kullanıcılar tarafından gönderilen profil raporları.">{result.data ? <DataTable rows={result.data} columns={[{ key: 'reported_username', label: 'Profil' }, { key: 'reason', label: 'Neden' }, { key: 'status', label: 'Durum' }, { key: 'reporter_email', label: 'Bildiren' }, { key: 'created_at', label: 'Tarih' }]} /> : <ResultState error={result.error} />}</PageShell>;
}

export function AdminMediaPage() {
  const result = useAdminRpc<JsonRow[]>('admin_get_media');
  return <PageShell title="Medya" description="Platformdaki yüklenmiş medya kayıtları.">{result.data ? <DataTable rows={result.data} columns={[{ key: 'file_name', label: 'Dosya' }, { key: 'username', label: 'Profil' }, { key: 'mime_type', label: 'Tür' }, { key: 'file_size', label: 'Boyut' }, { key: 'created_at', label: 'Tarih' }]} /> : <ResultState error={result.error} />}</PageShell>;
}

export function AdminAnalyticsPage() {
  const result = useAdminRpc<JsonRow>('admin_get_analytics', { days: 30 });
  if (!result.data) return <PageShell title="Analitik" description="Son 30 günün platform metrikleri."><ResultState error={result.error} /></PageShell>;
  return <PageShell title="Analitik" description="Son 30 günün platform metrikleri."><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(result.data).filter(([key]) => key !== 'daily_views').map(([key, value]) => <div key={key} className="card p-5"><p className="text-xs uppercase tracking-wider text-ink-300">{key.replace(/_/g, ' ')}</p><p className="mt-2 font-display text-2xl font-bold text-white">{formatValue(value)}</p></div>)}</div><div className="mt-6"><DataTable rows={Array.isArray(result.data.daily_views) ? result.data.daily_views as JsonRow[] : []} columns={[{ key: 'date', label: 'Gün' }, { key: 'count', label: 'Görüntülenme' }]} /></div></PageShell>;
}

export function AdminSupportPage() {
  return <PageShell title="Destek" description="Destek taleplerini yönet."><div className="card flex items-start gap-3 p-5 text-sm text-ink-100"><ShieldAlert className="h-5 w-5 shrink-0 text-warning" /><div><p className="font-medium text-white">Destek kayıtları</p><p className="mt-1 text-ink-200">Destek talepleri için mevcut veritabanı yetkilendirmesi korunuyor. Admin cevapları ve durum güncellemeleri, destek akışındaki kayıtlar üzerinden yapılır.</p></div></div></PageShell>;
}

export function AdminSettingsPage() {
  return <PageShell title="Ayarlar" description="Yönetim erişimi ve platform durumu."><div className="grid gap-4 sm:grid-cols-2"><div className="card p-5"><CheckCircle2 className="h-5 w-5 text-success" /><h2 className="mt-3 font-display font-semibold text-white">Admin yetkilendirmesi</h2><p className="mt-1 text-sm text-ink-200">Admin RPC’leri yalnızca yetkili oturumlara açıktır.</p></div><div className="card p-5"><ImageIcon className="h-5 w-5 text-accent" /><h2 className="mt-3 font-display font-semibold text-white">Medya depolama</h2><p className="mt-1 text-sm text-ink-200">Kullanıcı medya dosyaları sahip klasörleriyle sınırlandırılır.</p></div></div></PageShell>;
}
