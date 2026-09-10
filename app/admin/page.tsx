'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Check, Copy, Download, Heart, ImagePlus, LockKeyhole, Music2, UploadCloud } from 'lucide-react';

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

// Use a plain, high-contrast QR so phone cameras can scan it reliably.
function buildQrUrl(url: string) {
  const params = new URLSearchParams({ text: url, format: 'png', size: '600', margin: '6', ecLevel: 'H' });
  return `https://quickchart.io/qr?${params.toString()}`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [music, setMusic] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const previews = useMemo(() => photos.map(file => ({ file, url: URL.createObjectURL(file) })), [photos]);
  const qrUrl = useMemo(() => createdUrl ? buildQrUrl(createdUrl) : '', [createdUrl]);

  async function login(e: FormEvent) {
    e.preventDefault(); setError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) { setError('كلمة المرور غير صحيحة'); return; }
    setLoggedIn(true);
  }

  async function create(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setCreatedUrl('');
    try {
      const optimizedPhotos = await Promise.all(photos.map(compressImage));
      const form = new FormData();
      form.append('name', name); form.append('message', message);
      optimizedPhotos.forEach(file => form.append('photos', file));
      if (music) form.append('music', music);
      const res = await fetch('/api/birthdays', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء البطاقة');
      setCreatedUrl(`${window.location.origin}${data.url}`);
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
        <div className="mb-8"><p className="text-sm uppercase tracking-[0.3em] text-red-300/70">Birthday Studio</p><h1 className="mt-2 font-playfair text-4xl sm:text-5xl">إنشاء عيد ميلاد جديد</h1><p className="mt-3 text-white/50">اسم + رسالة + صور + أغنية، والباقي تلقائي.</p></div>
        <form onSubmit={create} className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div><label className="mb-2 block text-sm text-white/70">اسم المستلم</label><input value={name} onChange={e => setName(e.target.value)} required placeholder="مثلاً Sara" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-500/50" /></div>
          <div><label className="mb-2 block text-sm text-white/70">الرسالة</label><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={6} placeholder="اكتب رسالتك هنا..." className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-500/50" /></div>
          <div><label className="mb-2 flex items-center gap-2 text-sm text-white/70"><ImagePlus size={17} /> الصور</label><input type="file" accept="image/*" multiple required onChange={e => setPhotos(Array.from(e.target.files || []))} className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60" />{previews.length > 0 && <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map(({ file, url }) => <div key={file.name + file.lastModified} className="aspect-square overflow-hidden rounded-xl border border-white/10"><img src={url} alt="preview" className="h-full w-full object-cover" /></div>)}</div>}</div>
          <div><label className="mb-2 flex items-center gap-2 text-sm text-white/70"><Music2 size={17} /> الأغنية</label><input type="file" accept="audio/*" required onChange={e => setMusic(e.target.files?.[0] || null)} className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60" />{music && <p className="mt-2 text-sm text-white/50">{music.name}</p>}</div>
          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud size={19} /> {loading ? 'جاري إنشاء البطاقة...' : 'إنشاء البطاقة'}</button>
        </form>
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
