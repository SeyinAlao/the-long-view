import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';
import { MyResearchView } from '@/components/theses/my-research-view';

export default async function MyResearchPage() {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login?next=/theses/mine');
  }

  return <MyResearchView />;
}
