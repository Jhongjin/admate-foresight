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
  const accessLedger = [
    { label: '제품 접근', value: accountCopy.productSummary, detail: '성과 예측과 기준 데이터 화면 접근 가능' },
    { label: '운영 역할', value: accountCopy.roleSummary, detail: '시뮬레이션, 트렌드, 시즌 판단 검토' },
    { label: '작업 공간', value: accountCopy.workspaceSummary, detail: 'Foresight 매체 계획 작업 공간' },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
      <section className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-[#f8f6f0] px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex w-fit rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">
              성과 예측 화면 접근
            </p>
            <div
              aria-label="접근 상태"
              className="inline-flex w-fit items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
            >
              {accountCopy.statusLabel}
            </div>
          </div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-5 sm:p-8">
            <p className="text-sm font-semibold text-teal-700">AdMate Foresight</p>
            <h1 className="mt-3 max-w-2xl text-2xl font-bold leading-tight text-gray-950 sm:text-3xl">
              {accountCopy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">{accountCopy.body}</p>

            <div className="mt-7 rounded-md border border-stone-200 bg-[#fbfaf7]">
              <div className="border-b border-stone-200 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">계획 화면 준비도</p>
              </div>
              <div className="grid divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {accessLedger.map((item) => (
                  <div key={item.label} className="min-w-0 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-bold text-gray-950">{item.value}</p>
                    <p className="mt-1 text-[11px] leading-snug text-gray-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={returnPath}
                className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                {returnLabel}
              </Link>
              <a
                href={FORESIGHT_ACCESS_REQUEST_URL}
                className="flex min-h-11 items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                {accountCopy.secondaryAction}
              </a>
            </div>
          </div>

          <aside className="border-t border-stone-200 bg-[#f6f4ee] p-5 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">다음 작업 화면</p>
            <h2 className="mt-2 text-base font-bold text-gray-950">계정 확인 후 바로 열 수 있는 계획 화면</h2>
            <div className="mt-5 grid gap-2">
              {secondaryActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                >
                  <span>{action.label}</span>
                  <span aria-hidden="true" className="text-xs text-stone-400">열기</span>
                </Link>
              ))}
            </div>
            <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-5 text-stone-500">
              이 화면은 접근 상태만 확인합니다. 예측, 트렌드, 시즌 데이터는 각 계획 화면에서 다시 판독합니다.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
