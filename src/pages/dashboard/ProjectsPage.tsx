import { useEffect, useState } from 'react';
import { GripVertical, Layout, Pencil, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { isSafeUrl, normalizeUrl } from '@/lib/utils';
import type { Project } from '@/lib/types';

export function ProjectsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('projects').select('*').eq('profile_id', profile.id).order('position', { ascending: true });
    setProjects((data as Project[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return <DashboardLayout><div className="card p-8 text-center text-sm text-ink-200">Yükleniyor...</div></DashboardLayout>;

  const save = async (data: { title: string; description: string; image_url: string; project_url: string; github_url: string; technologies: string[] }) => {
    const project_url = data.project_url ? normalizeUrl(data.project_url) : '';
    const github_url = data.github_url ? normalizeUrl(data.github_url) : '';
    if (project_url && !isSafeUrl(project_url)) { toast('Geçersiz proje URL.', 'error'); return; }
    if (github_url && !isSafeUrl(github_url)) { toast('Geçersiz GitHub URL.', 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('projects').update({ ...data, project_url, github_url, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { toast('Güncellenemedi.', 'error'); return; }
      toast('Proje güncellendi.', 'success');
    } else {
      const position = projects?.length ?? 0;
      const { error } = await supabase.from('projects').insert({ profile_id: profile.id, ...data, project_url, github_url, position });
      if (error) { toast('Eklenemedi.', 'error'); return; }
      toast('Proje eklendi.', 'success');
    }
    setShowModal(false);
    await load();
  };

  const toggle = async (p: Project) => {
    await supabase.from('projects').update({ is_visible: !p.is_visible }).eq('id', p.id);
    await load();
  };

  const remove = async (p: Project) => {
    const { error } = await supabase.from('projects').delete().eq('id', p.id);
    if (error) { toast('Silinemedi.', 'error'); return; }
    toast('Silindi.', 'success');
    await load();
  };

  const reorder = async (from: number, to: number) => {
    if (!projects || from === to) return;
    const next = [...projects];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setProjects(next);
    await Promise.all(next.map((p, i) => supabase.from('projects').update({ position: i }).eq('id', p.id)));
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Projeler</h1>
          <p className="mt-1 text-sm text-ink-200">Portföyündeki projeleri göster.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Ekle</button>
      </div>

      {projects === null ? (
        <div className="card p-8 text-center"><Spinner className="mx-auto h-6 w-6 text-accent" /></div>
      ) : projects.length === 0 ? (
        <EmptyState icon={<Layout className="h-6 w-6" />} title="Henüz proje yok" description="Yaptığın projeleri ekle, profilinde şık kartlarla görünsün." action={<button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> İlk projeni ekle</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p, index) => (
            <div key={p.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }} className="card p-4">
              <div className="flex items-start gap-3">
                <GripVertical className="mt-1 h-5 w-5 cursor-grab text-ink-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-display text-base font-semibold text-white">{p.title}</h3>
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={() => toggle(p)} className={`chip ${p.is_visible ? 'border-success/30 text-success' : 'text-ink-300'}`}>{p.is_visible ? 'Görünür' : 'Gizli'}</button>
                      <button onClick={() => { setEditing(p); setShowModal(true); }} className="text-ink-300 hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(p)} className="text-ink-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {p.description && <p className="mt-1 text-sm text-ink-200 line-clamp-2">{p.description}</p>}
                  {p.technologies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.technologies.map((t) => <span key={t} className="chip">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ProjectModal project={editing} onClose={() => setShowModal(false)} onSave={save} />}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)} title="Projeyi sil" message="Bu projeyi silmek istediğine emin misin?" confirmLabel="Sil" danger />
    </DashboardLayout>
  );
}

function ProjectModal({ project, onClose, onSave }: { project: Project | null; onClose: () => void; onSave: (data: { title: string; description: string; image_url: string; project_url: string; github_url: string; technologies: string[] }) => void }) {
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [imageUrl, setImageUrl] = useState(project?.image_url ?? '');
  const [projectUrl, setProjectUrl] = useState(project?.project_url ?? '');
  const [githubUrl, setGithubUrl] = useState(project?.github_url ?? '');
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>(project?.technologies ?? []);
  const [saving, setSaving] = useState(false);

  const addTech = () => {
    const t = techInput.trim();
    if (t && !technologies.includes(t)) setTechnologies([...technologies, t]);
    setTechInput('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({ title, description, image_url: imageUrl, project_url: projectUrl, github_url: githubUrl, technologies });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={project ? 'Projeyi düzenle' : 'Yeni proje'} maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Başlık</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Açıklama</label>
          <textarea className="input min-h-[80px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Görsel URL</label>
          <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Proje URL</label>
            <input className="input" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="label">GitHub URL</label>
            <input className="input" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
          </div>
        </div>
        <div>
          <label className="label">Teknolojiler</label>
          <div className="flex gap-2">
            <input className="input" value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())} placeholder="React, Node, ..." />
            <button type="button" onClick={addTech} className="btn-outline">Ekle</button>
          </div>
          {technologies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {technologies.map((t) => (
                <button key={t} type="button" onClick={() => setTechnologies(technologies.filter((x) => x !== t))} className="chip hover:border-danger/30 hover:text-danger">{t} ×</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner /> : 'Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}
