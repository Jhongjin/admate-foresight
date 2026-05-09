import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import InsightsPage from './InsightsPageClient';

export default function Page() {
  requireForesightPageSession('/insights');
  return <InsightsPage />;
}
