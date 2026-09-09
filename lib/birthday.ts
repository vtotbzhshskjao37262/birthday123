import { createHash } from 'crypto';

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
