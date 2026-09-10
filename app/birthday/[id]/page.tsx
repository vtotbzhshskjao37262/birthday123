import { notFound } from 'next/navigation';
import BirthdayExperience from '@/components/BirthdayExperience';
import { getBirthday, getBirthdayTheme } from '@/lib/birthday';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BirthdayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slug = decodeURIComponent(id);
  const birthday = await getBirthday(slug);
  if (!birthday) notFound();
  return <BirthdayExperience birthday={birthday} theme={getBirthdayTheme(slug)} />;
}
