import { NextResponse } from 'next/server';
import { adminToken } from '@/lib/birthday';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set('birthday_admin', adminToken(password), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }
}
