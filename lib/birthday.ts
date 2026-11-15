import { createHash } from 'crypto';

export type BirthdayTheme = 'pink' | 'red' | 'blue' | 'green';

export type BirthdayConfig = {
  id: string;
  slug: string;
  name: string;
  message: string;
  photos: string[];
  music_url: string;
  created_at?: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const BIRTHDAY_THEMES: Record<BirthdayTheme, { label: string; color: string }> = {
  pink: { label: 'وردي', color: '#ec4899' },
  red: { label: 'أحمر', color: '#ef4444' },
  blue: { label: 'أزرق', color: '#3b82f6' },
  green: { label: 'أخضر', color: '#22c55e' },
};

export function isBirthdayTheme(value: string): value is BirthdayTheme {
  return value in BIRTHDAY_THEMES;
}

export function getBirthdayTheme(slug: string): BirthdayTheme {
  const match = slug.match(/-(pink|red|blue|green)(?:-\d+)?$/);
  return match && isBirthdayTheme(match[1]) ? match[1] : 'pink';
}

function assertServerConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  assertServerConfig();
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return slug || `birthday-${Date.now()}`;
}

export function adminToken(password: string) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('Missing ADMIN_SECRET');
  return createHash('sha256').update(`${password}:${secret}`).digest('hex');
}

export function isAdminTokenValid(token: string | undefined) {
  const password = process.env.ADMIN_PASSWORD;
  if (!token || !password) return false;
  return token === adminToken(password);
}

export function publicStorageUrl(path: string) {
  assertServerConfig();
  return `${SUPABASE_URL}/storage/v1/object/public/birthday-assets/${path}`;
}

export async function uploadToStorage(path: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const response = await supabaseFetch(`/storage/v1/object/birthday-assets/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
      'cache-control': '31536000',
    },
    body: buffer,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Storage upload failed: ${text}`);
  }
  return publicStorageUrl(path);
}

export async function createBirthday(config: BirthdayConfig) {
  const response = await supabaseFetch('/rest/v1/birthday_configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Database insert failed: ${text}`);
  }
  const rows = await response.json();
  return rows[0] as BirthdayConfig;
}

export async function getBirthday(slug: string) {
  const response = await supabaseFetch(`/rest/v1/birthday_configs?slug=eq.${encodeURIComponent(slug)}&select=*`);
  if (!response.ok) return null;
  const rows = await response.json();
  return (rows[0] as BirthdayConfig | undefined) ?? null;
}


export async function listBirthdays() {
  const response = await supabaseFetch('/rest/v1/birthday_configs?select=*&order=created_at.desc');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Database list failed: ${text}`);
  }
  return await response.json() as BirthdayConfig[];
}

function storagePathFromPublicUrl(value: string) {
  try {
    const url = new URL(value);
    const marker = '/storage/v1/object/public/birthday-assets/';
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function removeStorageObjects(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return;
  const response = await supabaseFetch('/storage/v1/object/birthday-assets', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: uniquePaths }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Storage delete failed: ${text}`);
  }
}

export async function deleteBirthdayAsset(id: string, assetUrl: string) {
  const response = await supabaseFetch(`/rest/v1/birthday_configs?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!response.ok) throw new Error('تعذر قراءة المشروع');
  const rows = await response.json() as BirthdayConfig[];
  const birthday = rows[0];
  if (!birthday) throw new Error('المشروع غير موجود');

  const path = storagePathFromPublicUrl(assetUrl);
  if (!path || !path.startsWith(`${id}/`)) throw new Error('مسار الملف غير صالح');

  const isPhoto = birthday.photos.includes(assetUrl);
  const isMusic = birthday.music_url === assetUrl;
  if (!isPhoto && !isMusic) throw new Error('الملف غير مرتبط بهذا المشروع');

  const patch = isPhoto
    ? { photos: birthday.photos.filter(photo => photo !== assetUrl) }
    : { music_url: '' };
  const update = await supabaseFetch(`/rest/v1/birthday_configs?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!update.ok) {
    const text = await update.text();
    throw new Error(`Database update failed: ${text}`);
  }
  await removeStorageObjects([path]);
}

export async function deleteBirthdayProject(id: string) {
  const response = await supabaseFetch(`/rest/v1/birthday_configs?id=eq.${encodeURIComponent(id)}&select=id,photos,music_url`);
  if (!response.ok) throw new Error('تعذر قراءة المشروع');
  const rows = await response.json() as { id: string; photos: string[]; music_url: string | null }[];
  const birthday = rows[0];
  if (!birthday) throw new Error('المشروع غير موجود');

  const paths = [
    ...(birthday.photos || []).map(storagePathFromPublicUrl),
    birthday.music_url ? storagePathFromPublicUrl(birthday.music_url) : null,
  ].filter((path): path is string => Boolean(path && path.startsWith(`${id}/`)));
  await removeStorageObjects(paths);

  const deletion = await supabaseFetch(`/rest/v1/birthday_configs?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  if (!deletion.ok) {
    const text = await deletion.text();
    throw new Error(`Database delete failed: ${text}`);
  }
}
