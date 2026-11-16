'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Check, Copy, Heart, ImagePlus, Music2, UploadCloud } from 'lucide-react';

type Theme = 'pink' | 'red' | 'blue' | 'green';
const themes: { id: Theme; label: string; color: string }[] = [
  { id: 'pink', label: 'وردي', color: '#ec4899' },
  { id: 'red', label: 'أحمر', color: '#ef4444' },
  { id: 'blue', label: 'أزرق', color: '#3b82f6' },
  { id: 'green', label: 'أخضر', color: '#22c55e' },
];

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 700 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); return file; }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: file.lastModified });
}

export default function CreateBirthdayPage() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<Theme>('pink');
  const [photos, setPhotos] = useState<File[]>([]);
  const [music, setMusic] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const previews = useMemo(() => photos.map(file => ({ file, url: URL.createObjectURL(file) })), [photos]);
  const qrUrl = useMemo(() => createdUrl ? `https://quickchart.io/qr?text=${encodeURIComponent(createdUrl)}&format=png&size=500&margin=4&ecLevel=H` : '', [createdUrl]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setCreatedUrl('');
    try {
      const optimizedPhotos = await Promise.all(photos.map(compressImage));
      const form = new FormData();
      form.append('name', name); form.append('message', message); form.append('theme', theme);
      form.append('website', '');
      optimizedPhotos.forEach(file => form.append('photos', file));
      if (music) form.append('music', music);
      const response = await fetch('/api/public/birthdays', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل إنشاء البطاقة');
      setCreatedUrl(`${window.location.origin}${data.url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#060010] px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <Heart className="mx-auto mb-4 h-12 w-12 fill-red-500 text-red-500" />
          <p className="text-sm uppercase tracking-[0.3em] text-red-300/70">Birthday Studio</p>
          <h1 className="mt-2 font-playfair text-4xl sm:text-5xl">اصنع بطاقة عيد ميلاد</h1>
          <p className="mt-3 text-white/55">صمّم بطاقتك وشاركها مباشرة مع الشخص الذي تحبه.</p>
        </header>

        <form onSubmit={create} className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div>
            <label className="mb-2 block text-sm text-white/70">اسم المستلم</label>
            <input value={name} onChange={e => setName(e.target.value)} required maxLength={80} placeholder="مثلاً Sara" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-500/50" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">الرسالة</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required maxLength={3000} rows={6} placeholder="اكتب رسالتك هنا..." className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-red-500/50" />
          </div>
          <div>
            <label className="mb-3 block text-sm text-white/70">لون البطاقة</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {themes.map(option => (
                <button key={option.id} type="button" onClick={() => setTheme(option.id)} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${theme === option.id ? 'border-white/40 bg-white/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}>
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: option.color }} />{option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-white/70"><ImagePlus size={17} /> الصور (حتى 8 صور)</label>
            <input type="file" accept="image/*" multiple required onChange={e => setPhotos(Array.from(e.target.files || []).slice(0, 8))} className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60" />
            {previews.length > 0 && <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map(({ file, url }) => <div key={file.name + file.lastModified} className="aspect-square overflow-hidden rounded-xl border border-white/10"><img src={url} alt="معاينة الصورة" className="h-full w-full object-cover" /></div>)}</div>}
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-white/70"><Music2 size={17} /> الأغنية</label>
            <input type="file" accept="audio/*" required onChange={e => setMusic(e.target.files?.[0] || null)} className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/60" />
            {music && <p className="mt-2 text-sm text-white/50">{music.name}</p>}
          </div>
          <p className="text-xs leading-6 text-white/40">الحد الأقصى للصورة الواحدة 3MB، والأغنية 4MB، ومجموع الملفات 4MB.</p>
          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"><UploadCloud size={19} />{loading ? 'جاري إنشاء البطاقة...' : 'إنشاء البطاقة'}</button>
        </form>

        {createdUrl && (
          <section className="mt-6 rounded-[2rem] border border-green-400/20 bg-green-400/10 p-6">
            <div className="flex items-center gap-2 text-green-300"><Check size={20} /> تم إنشاء البطاقة بنجاح</div>
            <p className="mt-3 break-all rounded-2xl bg-black/20 p-4 font-mono text-sm text-white/80">{createdUrl}</p>
            <div className="mt-5 flex flex-col items-center rounded-3xl border border-white/10 bg-black/20 p-5">
              <img src={qrUrl} alt="QR code" className="h-64 w-64 rounded-2xl bg-white p-3" />
              <p className="mt-3 text-center text-sm text-white/60">امسح الرمز لفتح البطاقة</p>
            </div>
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(createdUrl); setCopied(true); }} className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"><Copy size={16} />{copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}</button>
            <a href={createdUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">فتح البطاقة</a>
          </section>
        )}
        <p className="mt-8 text-center text-xs text-white/30">Birthday Studio</p>
      </div>
    </main>
  );
}
