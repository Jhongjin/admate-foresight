import { redirect } from 'next/navigation';
import { buildForesightLoginPath } from '@/lib/auth/foresightAuth';

export function requireForesightPageSession(path: string): never {
  redirect(buildForesightLoginPath(path));
}
