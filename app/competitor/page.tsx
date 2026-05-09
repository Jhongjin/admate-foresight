import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import CompetitorPage from './CompetitorPageClient';

export default function Page() {
  requireForesightPageSession('/competitor');
  return <CompetitorPage />;
}
