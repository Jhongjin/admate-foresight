import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import TrendsPage from './TrendsPageClient';

export default function Page() {
  requireForesightPageSession('/trends');
  return <TrendsPage />;
}
