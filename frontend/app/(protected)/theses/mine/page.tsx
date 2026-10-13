import { requireWritingUser } from '@/lib/server-auth';
import { MyResearchView } from '@/components/theses/my-research-view';

export default async function MyResearchPage() {
  await requireWritingUser('/theses/mine');

  return <MyResearchView />;
}
