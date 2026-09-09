import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSWORD', 'ADMIN_SECRET'] as const;
  const missing = required.filter((key) => !process.env[key]);

  return NextResponse.json(
    {
      ok: missing.length === 0,
      missing,
      message: missing.length === 0 ? 'Birthday Studio is configured.' : 'Missing required environment variables.',
    },
    { status: missing.length === 0 ? 200 : 500 },
  );
}
