import { requireWritingUser } from '@/lib/server-auth';
import { ThesisForm } from '@/components/theses/thesis-form';

export default async function NewThesisPage() {
  await requireWritingUser('/theses/new');

  return <ThesisForm />;
}
