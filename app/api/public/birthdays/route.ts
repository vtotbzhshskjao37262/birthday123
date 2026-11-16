import { NextResponse } from 'next/server';
import { createBirthday, slugify, uploadToStorage, isBirthdayTheme, type BirthdayTheme } from '@/lib/birthday';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_MUSIC_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024;
const recentRequests = new Map<string, number[]>();

export async function POST(request: Request) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const recent = (recentRequests.get(ip) || []).filter(time => now - time < 15 * 60 * 1000);
    if (recent.length >= 5) {
      return NextResponse.json({ error: 'تم تجاوز عدد المحاولات. حاول بعد 15 دقيقة.' }, { status: 429 });
    }
    recent.push(now);
    recentRequests.set(ip, recent);

    const form = await request.formData();
    if (String(form.get('website') || '').trim()) {
      return NextResponse.json({ error: 'تعذر معالجة الطلب' }, { status: 400 });
    }

    const name = String(form.get('name') || '').trim().slice(0, 80);
    const message = String(form.get('message') || '').trim().slice(0, 3000);
    const themeValue = String(form.get('theme') || 'pink').trim();
    const theme: BirthdayTheme = isBirthdayTheme(themeValue) ? themeValue : 'pink';
    const music = form.get('music');
    const photos = form.getAll('photos').filter((item): item is File => item instanceof File && item.size > 0);

    if (!name) return NextResponse.json({ error: 'اكتب اسم المستلم' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'اكتب الرسالة' }, { status: 400 });
    if (!photos.length) return NextResponse.json({ error: 'ارفع صورة واحدة على الأقل' }, { status: 400 });
    if (!(music instanceof File) || music.size === 0) return NextResponse.json({ error: 'ارفع الأغنية' }, { status: 400 });
    if (photos.length > 8) return NextResponse.json({ error: 'الحد الأقصى 8 صور في البطاقة' }, { status: 400 });
    if (photos.some(file => !file.type.startsWith('image/'))) return NextResponse.json({ error: 'تأكد أن كل الملفات صور' }, { status: 400 });
    if (photos.some(file => file.size > MAX_IMAGE_BYTES)) return NextResponse.json({ error: 'حجم الصورة الواحدة يجب ألا يتجاوز 3MB' }, { status: 400 });
    if (!music.type.startsWith('audio/')) return NextResponse.json({ error: 'ملف الأغنية يجب أن يكون صوتيًا' }, { status: 400 });
    if (music.size > MAX_MUSIC_BYTES) return NextResponse.json({ error: 'حجم الأغنية يجب ألا يتجاوز 4MB' }, { status: 400 });

    const totalUploadBytes = photos.reduce((sum, file) => sum + file.size, 0) + music.size;
    if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'إجمالي حجم الصور والأغنية يجب ألا يتجاوز 4MB. استخدم ملفات أصغر.' }, { status: 400 });
    }

    const id = randomUUID();
    const baseSlug = `${slugify(name)}-${theme}`;
    let slug = baseSlug;
    let suffix = 2;
    const photoUrls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      photoUrls.push(await uploadToStorage(`${id}/photos/${String(i + 1).padStart(2, '0')}.${ext}`, file));
    }

    const musicExt = (music.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
    const musicUrl = await uploadToStorage(`${id}/music.${musicExt}`, music);

    let created;
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        created = await createBirthday({ id, slug, name, message, photos: photoUrls, music_url: musicUrl });
        break;
      } catch (error) {
        if (attempt === 19) throw error;
        slug = `${baseSlug}-${suffix++}`;
      }
    }

    return NextResponse.json({ ok: true, url: `/birthday/${slug}` });
  } catch (error) {
    console.error('Public birthday creation failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
