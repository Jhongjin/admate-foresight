import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import TrendsPage from './TrendsPageClient';

export default async function Page() {
  await requireForesightPageSession('/trends');
  return <TrendsPage />;
}
