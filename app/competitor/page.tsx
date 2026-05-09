import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import CompetitorPage from './CompetitorPageClient';

export default async function Page() {
  await requireForesightPageSession('/competitor');
  return <CompetitorPage />;
}
