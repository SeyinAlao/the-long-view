import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';
import { ThesisForm } from '@/components/theses/thesis-form';

export default async function NewThesisPage() {
  // Belt and braces, same as the dashboard — proxy.ts already redirects
  // unauthenticated requests before they reach this far.
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login?next=/theses/new');
  }

  return <ThesisForm />;
}
