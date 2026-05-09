import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import InsightsPage from './InsightsPageClient';

export default async function Page() {
  await requireForesightPageSession('/insights');
  return <InsightsPage />;
}
