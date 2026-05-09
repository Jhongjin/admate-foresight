import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';
import SimulatorPage from './SimulatorPageClient';

export default async function Page() {
  await requireForesightPageSession('/');
  return <SimulatorPage />;
}
