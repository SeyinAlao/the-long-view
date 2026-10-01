import { PageSkeleton } from '@/components/ui/page-skeleton';

// Shown instantly while this page waits on the API - see PageSkeleton.
export default function Loading() {
  return <PageSkeleton variant="form" />;
}
