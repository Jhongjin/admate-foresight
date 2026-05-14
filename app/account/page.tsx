import type { Metadata } from 'next';
import Link from 'next/link';
import { FORESIGHT_ACCOUNT_ACCESS_COPY } from '@/lib/auth/foresightAccessCopy';
import { sanitizeForesightNextPath, FORESIGHT_ACCESS_REQUEST_URL } from '@/lib/auth/foresightAuth';
import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';

export const metadata: Metadata = {
  title: 'AdMate Foresight 계정',
  description: 'AdMate Foresight 계정과 접근 상태를 확인합니다.',
};

interface AccountPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const secondaryActions = [
  { href: '/trends', label: '업종별 트렌드' },
  { href: '/insights', label: '시즌 인사이트' },
  { href: '/competitor', label: '경쟁사 모니터링' },
];

function describeReturnTarget(nextPath: string): string {
  const pathname = nextPath.split('?')[0];

  switch (pathname) {
    case '/trends':
      return '업종별 트렌드로 돌아가기';
    case '/insights':
      return '시즌 인사이트로 돌아가기';
    case '/competitor':
      return '경쟁사 모니터링으로 돌아가기';
    default:
      return '성과 예측으로 돌아가기';
  }
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  await requireForesightPageSession('/account');
  const params = await searchParams;
  const safeNextPath = sanitizeForesightNextPath(params?.next);
  const returnPath = safeNextPath.startsWith('/account') ? '/' : safeNextPath;
  const accountCopy = FORESIGHT_ACCOUNT_ACCESS_COPY.active;
  const returnLabel =
    returnPath === '/' ? accountCopy.primaryAction : describeReturnTarget(returnPath);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-[#f8f6f0] px-6 py-5 sm:px-8">
          <p className="inline-flex rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">
            Forecast cockpit access
          </p>
        </div>
        <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">AdMate Foresight</p>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">{accountCopy.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
              {accountCopy.body}
            </p>
          </div>
          <div
            aria-label="접근 상태"
            className="inline-flex w-fit items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
          >
            {accountCopy.statusLabel}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold text-stone-500">제품 접근</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{accountCopy.productSummary}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold text-stone-500">역할</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{accountCopy.roleSummary}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-xs font-semibold text-stone-500">작업 공간</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{accountCopy.workspaceSummary}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={returnPath}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            {returnLabel}
          </Link>
          <a
            href={FORESIGHT_ACCESS_REQUEST_URL}
            className="flex min-h-11 items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            {accountCopy.secondaryAction}
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-gray-100 pt-6 sm:flex-row sm:flex-wrap">
          {secondaryActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              {action.label}
            </Link>
          ))}
        </div>
        </div>
      </section>
    </div>
  );
}
