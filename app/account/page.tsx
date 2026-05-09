import type { Metadata } from 'next';
import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';

export const metadata: Metadata = {
  title: 'AdMate Foresight 계정',
  description: 'AdMate Foresight 계정과 접근 상태를 확인합니다.',
};

export default function AccountPage() {
  requireForesightPageSession('/account');
}
