import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { buildForesightLoginPath } from '@/lib/auth/foresightAuth';
import {
  FORESIGHT_SESSION_COOKIE_NAME,
  verifyForesightSessionCookie,
} from '@/lib/auth/foresightSession';

export async function requireForesightPageSession(path: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(FORESIGHT_SESSION_COOKIE_NAME)?.value;
  if (verifyForesightSessionCookie(sessionCookie)) return;

  redirect(buildForesightLoginPath(path));
}
