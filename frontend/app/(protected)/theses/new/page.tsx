import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';
import { ThesisForm } from '@/components/theses/thesis-form';

export default async function NewThesisPage() {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login?next=/theses/new');
  }

  return <ThesisForm />;
}
