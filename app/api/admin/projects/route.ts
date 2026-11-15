import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteBirthdayAsset, deleteBirthdayProject, isAdminTokenValid, listBirthdays } from '@/lib/birthday';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  return isAdminTokenValid(cookieStore.get('birthday_admin')?.value);
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  try {
    const birthdays = await listBirthdays();
    return NextResponse.json({ birthdays });
  } catch (error) {
    console.error('Admin project list failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر تحميل المشاريع' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const assetUrl = typeof body.assetUrl === 'string' ? body.assetUrl : '';

    if (!id) return NextResponse.json({ error: 'معرّف المشروع مطلوب' }, { status: 400 });

    if (assetUrl) {
      await deleteBirthdayAsset(id, assetUrl);
      return NextResponse.json({ ok: true, message: 'تم حذف الملف' });
    }

    await deleteBirthdayProject(id);
    return NextResponse.json({ ok: true, message: 'تم حذف المشروع وملفاته' });
  } catch (error) {
    console.error('Admin project deletion failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر الحذف' }, { status: 500 });
  }
}
