import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, LifeBuoy, Plus, Send } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { Modal } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlements';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { SupportTicket } from '@/lib/types';

type TicketReply = {
  id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
};

export function SupportPage() {
  const { user } = useAuth();
  const { can } = useEntitlements();
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, TicketReply[]>>({});
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTickets((data as SupportTicket[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  if (!user) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const isPriority = can('priority_support');

  const createTicket = async (subject: string, description: string): Promise<void> => {
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject,
      description,
      priority: isPriority ? 'high' : 'normal',
    });
    if (error) { toast('Oluşturulamadı.', 'error'); return; }
    toast('Destek talebi oluşturuldu.', 'success');
    setShowModal(false);
    await load();
  };

  const closeTicket = async (t: SupportTicket) => {
    const { error } = await supabase.from('support_tickets').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) { toast('Kapatılamadı.', 'error'); return; }
    toast('Talep kapatıldı.', 'success');
    await load();
  };

  const toggleExpand = async (ticketId: string) => {
    if (expandedTicket === ticketId) { setExpandedTicket(null); return; }
    setExpandedTicket(ticketId);
    if (!replies[ticketId]) {
      const { data } = await supabase.from('ticket_replies').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      setReplies((r) => ({ ...r, [ticketId]: (data as TicketReply[]) ?? [] }));
    }
  };

  const sendReply = async (ticketId: string): Promise<void> => {
    if (!replyText.trim() || !user) return;
    setSendingReply(true);
    const { error } = await supabase.from('ticket_replies').insert({
      ticket_id: ticketId,
      user_id: user.id,
      message: replyText.trim(),
      is_admin_reply: false,
    });
    if (error) { toast('Cevap gönderilemedi.', 'error'); setSendingReply(false); return; }
    setReplyText('');
    const { data } = await supabase.from('ticket_replies').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    setReplies((r) => ({ ...r, [ticketId]: (data as TicketReply[]) ?? [] }));
    setSendingReply(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Destek</h1>
          <p className="mt-1 text-sm text-ink-200">
            {isPriority ? 'Öncelikli destek hattı — Pro üye.' : 'Destek talebi oluştur.'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Yeni talep</button>
      </div>

      {isPriority && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5 text-sm text-accent">
          <LifeBuoy className="h-4 w-4" /> Pro üye olarak taleplerin öncelikli işleme alınır.
        </div>
      )}

      {tickets === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="h-6 w-6" />} title="Henüz talep yok" description="Bir sorun yaşarsan destek talebi oluştur." action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Yeni talep</button>} />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-white">{t.subject}</h3>
                  <p className="mt-1 text-xs text-ink-200 line-clamp-2">{t.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`chip ${t.status === 'open' ? 'border-warning/30 text-warning' : t.status === 'resolved' ? 'border-success/30 text-success' : 'text-ink-300'}`}>
                    {t.status === 'open' ? 'Açık' : t.status === 'resolved' ? 'Çözüldü' : 'Kapalı'}
                  </span>
                  {t.priority === 'high' && <span className="chip border-accent/30 text-accent text-[10px]">Öncelikli</span>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => toggleExpand(t.id)} className="flex items-center gap-1 text-xs text-ink-300 hover:text-white">
                  {expandedTicket === t.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Görüşmeler
                </button>
                {t.status === 'open' && (
                  <button onClick={() => closeTicket(t)} className="text-xs text-ink-300 hover:text-white">Talebi kapat</button>
                )}
              </div>
              {expandedTicket === t.id && (
                <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                  {(replies[t.id] ?? []).length === 0 && <p className="text-xs text-ink-300">Henüz cevap yok.</p>}
                  {(replies[t.id] ?? []).map((r) => (
                    <div key={r.id} className={`rounded-lg p-3 text-sm ${r.is_admin_reply ? 'border border-accent/20 bg-accent/5' : 'bg-white/[0.03]'}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className={`text-[10px] font-medium ${r.is_admin_reply ? 'text-accent' : 'text-ink-300'}`}>
                          {r.is_admin_reply ? 'Destek Ekibi' : 'Sen'}
                        </span>
                        <span className="text-[10px] text-ink-300">{new Date(r.created_at).toLocaleString('tr-TR')}</span>
                      </div>
                      <p className="text-sm text-ink-50">{r.message}</p>
                    </div>
                  ))}
                  {t.status !== 'closed' && (
                    <div className="flex gap-2 pt-2">
                      <input
                        className="input flex-1"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Cevap yaz..."
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(t.id); } }}
                      />
                      <button onClick={() => sendReply(t.id)} disabled={sendingReply || !replyText.trim()} className="btn-primary shrink-0">
                        {sendingReply ? <Spinner /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && <TicketModal onClose={() => setShowModal(false)} onSave={createTicket} />}
    </DashboardLayout>
  );
}

function TicketModal({ onClose, onSave }: { onClose: () => void; onSave: (subject: string, description: string) => Promise<void> }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    await onSave(subject, description);
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Yeni destek talebi" maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Konu</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sorunun özeti" required />
        </div>
        <div>
          <label className="label">Açıklama</label>
          <textarea className="input min-h-[120px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sorunu detaylı açıkla" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Gönder'}</button>
        </div>
      </form>
    </Modal>
  );
}
