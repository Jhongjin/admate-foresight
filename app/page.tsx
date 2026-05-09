import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import SimulatorPage from './SimulatorPageClient';

export default function Page() {
  requireForesightPageSession('/');
  return <SimulatorPage />;
}
