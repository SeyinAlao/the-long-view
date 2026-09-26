import { notFound, redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';
import { getThesisServer } from '@/lib/server-theses';
import { ThesisForm } from '@/components/theses/thesis-form';

export default async function EditThesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUserServer();
  if (!user) {
    redirect(`/login?next=/theses/${id}/edit`);
  }

  const thesis = await getThesisServer(id);
  // Draft privacy is enforced by the backend itself (returns 404 for a
  // draft that isn't yours) — getThesisServer just surfaces that as
  // null, and this becomes Next's real not-found page either way.
  if (!thesis) {
    notFound();
  }
  // A published thesis can't be edited — send them to the list instead
  // of showing a form that would just reject every save.
  if (thesis.status !== 'DRAFT') {
    redirect('/theses/mine');
  }

  return <ThesisForm existingThesis={thesis} />;
}
