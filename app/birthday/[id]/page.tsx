import { notFound } from 'next/navigation';
import BirthdayExperience from '@/components/BirthdayExperience';
import { getBirthday } from '@/lib/birthday';

export const dynamic = 'force-dynamic';

export default async function BirthdayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const birthday = await getBirthday(id);
  if (!birthday) notFound();
  return <BirthdayExperience birthday={birthday} />;
}
