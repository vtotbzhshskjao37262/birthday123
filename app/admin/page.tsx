'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Check, Copy, Download, Eye, FolderOpen, Heart, ImagePlus, LockKeyhole, Music2, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';
import type { BirthdayTheme } from '@/lib/birthday';

type BirthdayProject = { id: string; slug: string; name: string; message: string; photos: string[]; music_url: string | null; created_at?: string };

const themeOptions: { id: BirthdayTheme; label: string; color: string }[] = [
  { id: 'pink', label: 'وردي', color: '#ec4899' },
  { id: 'red', label: 'أحمر', color: '#ef4444' },
  { id: 'blue', label: 'أزرق', color: '#3b82f6' },
  { id: 'green', label: 'أخضر', color: '#22c55e' },
];

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 700 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const maxSize = 1600;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); return file; }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: file.lastModified });
}

function buildQrUrl(url: string, color: string) {
  const params = new URLSearchParams({ text: url, format: 'png', size: '600', margin: '6', dark: color.replace('#', ''), light: 'ffffff', ecLevel: 'H' });
  return `https://quickchart.io/qr?${params.toString()}`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<BirthdayTheme>('pink');
  const [photos, setPhotos] = useState<File[]>([]);
  const [music, setMusic] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<BirthdayProject[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [selectedProject, setSelectedProject] = useState<BirthdayProject | null>(null);
  const [deleting, setDeleting] = useState('');
  const previews = useMemo(() => photos.map(file => ({ file, url: URL.createObjectURL(file) })), [photos]);
  const selectedThemeColor = themeOptions.find(option => option.id === theme)?.color || '#ec4899';
  const qrUrl = useMemo(() => createdUrl ? buildQrUrl(createdUrl, selectedThemeColor) : '', [createdUrl, selectedThemeColor]);
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLocaleLowerCase();
    if (!query) return projects;
    return projects.filter(project => [project.name, project.message, project.slug].some(value => value?.toLocaleLowerCase().includes(query)));
  }, [projects, projectSearch]);
  const totalPhotos = useMemo(() => projects.reduce((sum, project) => sum + (project.photos?.length || 0), 0), [projects]);
  const totalMusic = useMemo(() => projects.filter(project => Boolean(project.music_url)).length, [projects]);

  async function refreshProjects() {
    setProjectsLoading(true); setProjectsError('');
    try {
      const res = await fetch('/api/admin/projects', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر تحميل المشاريع');
      setProjects(data.birthdays || []);
      setSelectedProject(current => current ? ((data.birthdays || []).find((item: BirthdayProject) => item.id === current.id) || null) : null);
    } catch (err) { setProjectsError(err instanceof Error ? err.message : 'تعذر تحميل المشاريع'); }
    finally { setProjectsLoading(false); }
  }

  async function removeProject(id: string) {
    if (!window.confirm('متأكد إنك تبي تحذف المشروع بالكامل؟ سيتم حذف البطاقة والصور والأغنية من التخزين، ولا يمكن التراجع.')) return;
    setDeleting(id); setProjectsError('');
    try {
      const res = await fetch('/api/admin/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المشروع');
      setSelectedProject(null);
      await refreshProjects();
    } catch (err) { setProjectsError(err instanceof Error ? err.message : 'فشل الحذف'); }
    finally { setDeleting(''); }
  }

  async function removeAsset(project: BirthdayProject, assetUrl: string) {
    if (!window.confirm('تبي تحذف هذا الملف نهائيًا من المشروع والتخزين؟')) return;
    setDeleting(assetUrl); setProjectsError('');
    try {
      const res = await fetch('/api/admin/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: project.id, assetUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الملف');
      await refreshProjects();
    } catch (err) { setProjectsError(err instanceof Error ? err.message : 'فشل الحذف'); }
    finally { setDeleting(''); }
  }

  async function login(e: FormEvent) {
    e.preventDefault(); setError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) { setError('كلمة المرور غير صحيحة'); return; }
    setLoggedIn(true);
    void refreshProjects();
  }

  async function create(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setCreatedUrl('');
    try {
      const optimizedPhotos = await Promise.all(photos.map(compressImage));
      const form = new FormData();
      form.append('name', name); form.append('message', message); form.append('theme', theme);
      optimizedPhotos.forEach(file => form.append('photos', file));
      if (music) form.append('music', music);
      const res = await fetch('/api/birthdays', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء البطاقة');
      setCreatedUrl(`${window.location.origin}${data.url}`);
      if (showProjects) void refreshProjects();
    } catch (err) { setError(err instanceof Error ? err.message : 'حدث خطأ'); }
    finally { setLoading(false); }
  }

  if (!loggedIn) return (
    <main className="min-h-screen bg-[#060010] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <form onSubmit={login} className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-8 text-center"><Heart className="mx-auto mb-4 h-12 w-12 fill-red-500 text-red-500" /><h1 className="font-playfair text-4xl">Birthday Studio</h1><p className="mt-2 text-white/50">لوحة إنشاء بطاقات عيد الميلاد</p></div>
          <label className="mb-2 block text-sm text-white/70">كلمة المرور</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="mb-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-500/50" />
          {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3 font-semibold transition hover:bg-red-400"><LockKeyhole size={18} /> دخول</button>
        </form>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#060010] px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-red-300/70">Birthday Studio</p>
          <h1 className="mt-2 font-playfair text-4xl sm:text-5xl">لوحة الإدارة</h1>
          <p className="mt-3 text-white/50">أنشئ بطاقات جديدة أو راجع مشاريعك السابقة وصورها.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setShowProjects(false)} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${!showProjects ? 'border-red-400/50 bg-red-500/15 text-red-100' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}`}><ImagePlus size={17} /> إنشاء مشروع</button>
            <button type="button" onClick={() => { setShowProjects(true); void refreshProjects(); }} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${showProjects ? 'border-red-400/50 bg-red-500/15 text-red-100' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}`}><FolderOpen size={17} /> مشاريعي السابقة</button>
          </div>
        </div>
        {!showProjects && <>
        <form onSubmit={create} className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div><label className="mb-2 block text-sm text-white/70">اسم المستلم</label><input value={name} onChange={e => setName(e.target.value)} required placeholder="مثلاً Sara" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-500/50" /></div>
          <div><label className="mb-2 block text-sm text-white/70">الرسالة</label><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={6} placeholder="اكتب رسالتك هنا..." className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-500/50" /></div>
          <div>
            <label className="mb-3 block text-sm text-white/70">لون البطاقة</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {themeOptions.map(option => (
                <button key={option.id} type="button" onClick={() => setTheme(option.id)} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${theme === option.id ? 'border-white/40 bg-white/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}>
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: option.color }} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div><label className="mb-2 flex items-center gap-2 text-sm text-white/70"><ImagePlus size={17} /> الصور</label><input type="file" accept="image/*" multiple required onChange={e => setPhotos(Array.from(e.target.files || []))} className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60" />{previews.length > 0 && <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map(({ file, url }) => <div key={file.name + file.lastModified} className="aspect-square overflow-hidden rounded-xl border border-white/10"><img src={url} alt="preview" className="h-full w-full object-cover" /></div>)}</div>}</div>
          <div><label className="mb-2 flex items-center gap-2 text-sm text-white/70"><Music2 size={17} /> الأغنية</label><input type="file" accept="audio/*" required onChange={e => setMusic(e.target.files?.[0] || null)} className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60" />{music && <p className="mt-2 text-sm text-white/50">{music.name}</p>}</div>
          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud size={19} /> {loading ? 'جاري إنشاء البطاقة...' : 'إنشاء البطاقة'}</button>
        </form>
        </>}
        {showProjects && <section className="space-y-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-semibold">أرشيف كل المشاريع</h2><p className="mt-1 text-sm text-white/50">كل البطاقات المحفوظة في قاعدة البيانات، مرتبة من الأحدث إلى الأقدم.</p></div>
            <button type="button" onClick={() => void refreshProjects()} disabled={projectsLoading} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"><RefreshCw size={16} className={projectsLoading ? 'animate-spin' : ''} /> تحديث القائمة</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-white/45">المشاريع</p><p className="mt-1 text-2xl font-bold">{projects.length}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-white/45">الصور</p><p className="mt-1 text-2xl font-bold">{totalPhotos}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-white/45">الأغاني</p><p className="mt-1 text-2xl font-bold">{totalMusic}</p></div>
          </div>
          <label className="block"><span className="mb-2 block text-sm text-white/65">ابحث في المشاريع بالاسم أو الرسالة أو الرابط</span><input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="اكتب اسم المشروع أو كلمة من الرسالة..." className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-red-400/50" /></label>
          {projectsError && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{projectsError}</p>}
          {projectsLoading && <p className="py-8 text-center text-white/50">جاري تحميل كل المشاريع والملفات المرتبطة بها...</p>}
          {!projectsLoading && projects.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">ما فيش مشاريع محفوظة في قاعدة البيانات.</div>}
          {!projectsLoading && projects.length > 0 && filteredProjects.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50">ما لقيناش مشروع يطابق بحثك.</div>}
          <p className="text-xs text-white/40">يعرض {filteredProjects.length} من أصل {projects.length} مشروع.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProjects.map(project => <article key={project.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {(project.photos?.length || 0) > 0 && <div className="grid h-40 grid-cols-3 gap-1 overflow-hidden bg-black/30">{project.photos.slice(0, 3).map((photo, index) => <img key={photo} src={photo} alt={`صورة ${index + 1} من مشروع ${project.name}`} className="h-full min-h-0 w-full object-cover" />)}</div>}
              <div className="p-4">
                <h3 className="text-lg font-semibold">{project.name || 'مشروع بدون اسم'}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-white/55">{project.message}</p>
                <p className="mt-2 text-xs text-white/40">{project.created_at ? new Date(project.created_at).toLocaleString('ar') : 'تاريخ الإنشاء غير متوفر'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55"><span className="rounded-full bg-white/10 px-2 py-1">{project.photos?.length || 0} صور</span><span className="rounded-full bg-white/10 px-2 py-1">{project.music_url ? 'الأغنية موجودة' : 'بدون أغنية'}</span></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedProject(project)} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"><Eye size={16} /> عرض كل التفاصيل</button>
                  <a href={`/birthday/${encodeURIComponent(project.slug)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">فتح البطاقة</a>
                  <button type="button" disabled={deleting === project.id} onClick={() => void removeProject(project.id)} className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-50"><Trash2 size={16} /> {deleting === project.id ? 'جاري الحذف...' : 'حذف المشروع'}</button>
                </div>
              </div>
            </article>)}
          </div>
        </section>}
        {selectedProject && <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto my-6 max-w-3xl rounded-3xl border border-white/10 bg-[#10091c] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-widest text-red-300/70">Project details</p><h2 className="mt-1 text-2xl font-semibold">{selectedProject.name}</h2><p className="mt-1 text-xs text-white/40">{selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleString('ar') : ''}</p></div>
              <button type="button" onClick={() => setSelectedProject(null)} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="إغلاق"><X size={19} /></button>
            </div>
            <div className="mt-5 rounded-2xl bg-white/5 p-4"><h3 className="mb-2 text-sm font-semibold text-white/70">الرسالة</h3><p className="whitespace-pre-wrap leading-8 text-white/85">{selectedProject.message}</p><p className="mt-3 break-all text-xs text-white/40">الرابط: {typeof window !== 'undefined' ? window.location.origin : ''}/birthday/{selectedProject.slug}</p></div>
            <div className="mt-6 flex items-center justify-between"><h3 className="font-semibold">صور المشروع ({selectedProject.photos?.length || 0})</h3></div>
            {selectedProject.photos?.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{selectedProject.photos.map((photo, index) => <div key={photo} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <a href={photo} target="_blank" rel="noreferrer"><img src={photo} alt={`صورة ${index + 1}`} className="aspect-square w-full object-cover" /></a>
              <button type="button" disabled={deleting === photo} onClick={() => void removeAsset(selectedProject, photo)} className="flex w-full items-center justify-center gap-2 bg-red-500/10 px-2 py-2 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-50"><Trash2 size={14} /> {deleting === photo ? 'جاري الحذف...' : 'حذف الصورة'}</button>
            </div>)}</div> : <p className="mt-3 text-sm text-white/45">لا توجد صور في هذا المشروع.</p>}
            {selectedProject.music_url && <div className="mt-5 space-y-3 rounded-xl bg-white/5 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><a href={selectedProject.music_url} target="_blank" rel="noreferrer" className="text-sm text-pink-200 underline">فتح ملف الأغنية</a><button type="button" disabled={deleting === selectedProject.music_url} onClick={() => void removeAsset(selectedProject, selectedProject.music_url!)} className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200"><Trash2 size={14} /> حذف الأغنية</button></div><audio controls preload="none" src={selectedProject.music_url} className="w-full" /></div>}
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setSelectedProject(null)} className="rounded-xl bg-white/10 px-5 py-2.5 text-sm hover:bg-white/15">إغلاق</button></div>
          </div>
        </div>}
        {createdUrl && <div className="mt-6 rounded-[2rem] border border-green-400/20 bg-green-400/10 p-6">
          <div className="flex items-center gap-2 text-green-300"><Check size={20} /> تم إنشاء البطاقة</div>
          <div className="mt-4 break-all rounded-2xl bg-black/20 p-4 font-mono text-sm text-white/80">{createdUrl}</div>
          <div className="mt-5 flex flex-col items-center rounded-3xl border border-pink-400/20 bg-black/20 p-5">
            <div className="mb-3 flex items-center gap-2 text-pink-200"><Heart size={18} className="fill-pink-500 text-pink-500" /> QR Code</div>
            <img src={qrUrl} alt="QR code for birthday card" className="h-64 w-64 rounded-2xl bg-white p-3 shadow-2xl sm:h-72 sm:w-72" />
            <p className="mt-4 text-center text-sm text-white/60">امسح الكود لفتح بطاقة عيد الميلاد مباشرة</p>
            <a href={qrUrl} download={`birthday-qr-${name || 'card'}.png`} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-pink-400"><Download size={17} /> حفظ QR كصورة</a>
          </div>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(createdUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"><Copy size={16} /> {copied ? 'تم النسخ' : 'نسخ الرابط'}</button>
        </div>}
      </div>
    </main>
  );
}
