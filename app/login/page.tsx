import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  getForesightLoginCopy,
  resolveForesightLoginState,
} from '@/lib/auth/foresightAccessCopy';
import {
  buildForesightCoreStartUrl,
  FORESIGHT_ACCESS_REQUEST_URL,
  sanitizeForesightNextPath,
} from '@/lib/auth/foresightAuth';
import {
  hasValidForesightSession,
  isForesightHandoffConfigured,
} from '@/lib/auth/foresightSession';

export const metadata: Metadata = {
  title: 'AdMate Foresight 로그인',
  description: 'AdMate Foresight에 접근하려면 AdMate 계정으로 로그인하세요.',
};

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function describeNextDestination(nextPath: string): string {
  const pathname = nextPath.split('?')[0];

  switch (pathname) {
    case '/trends':
      return '업종별 트렌드 화면으로 돌아갑니다.';
    case '/insights':
      return '시즌 인사이트 화면으로 돌아갑니다.';
    case '/competitor':
      return '경쟁사 모니터링 화면으로 돌아갑니다.';
    case '/account':
      return '계정 접근 상태 화면으로 돌아갑니다.';
    default:
      return '성과 예측 시뮬레이터로 돌아갑니다.';
  }
}

const forecastSignals = [
  { label: '기준 데이터', value: '최근 6개월', detail: '업종과 매체 기준을 먼저 맞춥니다.' },
  { label: '입력 항목', value: '예산 / 기간', detail: '목표 KPI와 집행 조건을 함께 봅니다.' },
  { label: '결과 범위', value: '예측 구간', detail: '성과 예상과 데이터 부족 상태를 구분합니다.' },
] as const;

const forecastSteps = [
  '기준 데이터 선택',
  '예산과 기간 입력',
  '예측 결과 확인',
  '인사이트 저장',
] as const;

const destinationCards = [
  { label: '시뮬레이터', title: '성과 예측', detail: '예산, 기간, KPI를 조정해 예상 성과 범위를 확인합니다.' },
  { label: '기준선', title: '업종 트렌드', detail: '최근 흐름과 시즌성을 기준 데이터로 함께 검토합니다.' },
  { label: '비교', title: '시장 감시', detail: '경쟁사와 주요 매체 변화를 분석 화면에서 확인합니다.' },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeForesightNextPath(params?.next);
  if (await hasValidForesightSession()) {
    redirect(nextPath);
  }

  const nextDescription = describeNextDestination(nextPath);
  const loginState = resolveForesightLoginState(params);
  const loginCopy = getForesightLoginCopy(loginState);
  const coreStartUrl = isForesightHandoffConfigured()
    ? buildForesightCoreStartUrl(nextPath)
    : null;
  const primaryActionHref =
    loginState === 'handoff_disabled' ? FORESIGHT_ACCESS_REQUEST_URL : coreStartUrl;
  const noticeToneClass =
    loginCopy.noticeTone === 'danger' ? 'text-red-700' : 'text-stone-500';

  return (
    <div className="foresight-login-stage min-h-[calc(100dvh-9rem)] py-8 sm:py-10">
      <section className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1.08fr)_430px]">
        <div className="foresight-gate-brief">
          <div className="foresight-gate-kicker">
            foresight.admate.ai.kr · 성과 예측 로그인
          </div>

          <div className="foresight-gate-head">
            <div>
              <h1 className="foresight-gate-title">
                {loginCopy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                {loginCopy.body}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-500">
                로그인 후에는 요청한 분석 화면으로 돌아가며, 세션 없이 예측 API나 기준 데이터는 호출하지 않습니다.
              </p>
            </div>
            <div className="foresight-gate-stamp" aria-hidden="true">
              <span>AF</span>
              <strong>Forecast</strong>
            </div>
          </div>

          <div className="foresight-gate-signal-strip" aria-label="Foresight 로그인 후 확인할 예측 기준">
            {forecastSignals.map((signal) => (
              <div key={signal.label}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <p>{signal.detail}</p>
              </div>
            ))}
          </div>

          <div className="foresight-gate-forecast" aria-label="성과 예측 화면 미리보기">
            <div className="foresight-gate-forecast-copy">
              <p>예측 작업 화면</p>
              <h2>성과 범위와 기준 데이터를 같은 화면에서 확인합니다.</h2>
              <span>
                최근 흐름, 시즌성, 경쟁 변화, 목표 KPI를 함께 보고 데이터가 부족한 상태도 명확히 구분합니다.
              </span>
            </div>
            <div className="foresight-gate-chart" aria-hidden="true">
              <div className="foresight-gate-chart-bars">
                <span style={{ height: '42%' }} />
                <span style={{ height: '58%' }} />
                <span style={{ height: '50%' }} />
                <span style={{ height: '74%' }} />
                <span style={{ height: '68%' }} />
                <span style={{ height: '86%' }} />
              </div>
              <svg viewBox="0 0 280 130" role="presentation">
                <path d="M14 98 C54 84 70 48 112 62 C156 78 166 24 210 38 C238 46 250 28 266 20" />
                <path d="M14 112 C62 100 90 78 126 86 C160 94 184 64 218 68 C242 70 256 58 266 52" />
              </svg>
              <div className="foresight-gate-chart-note">
                <span>예측 신뢰도</span>
                <strong>기준 확인 후 표시</strong>
              </div>
            </div>
          </div>

          <div className="foresight-gate-card-grid">
            {destinationCards.map((card) => (
              <article key={card.label}>
                <p>{card.label}</p>
                <strong>{card.title}</strong>
                <span>{card.detail}</span>
              </article>
            ))}
          </div>

          <div className="foresight-gate-step-strip" aria-label="로그인 후 열리는 Foresight 작업 순서">
            {forecastSteps.map((step, index) => (
              <span key={step}>
                <em>{String(index + 1).padStart(2, '0')}</em>
                {step}
              </span>
            ))}
          </div>
        </div>

        <aside className="foresight-gate-action">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              로그인 후 이동
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">
              Foresight 분석 화면 열기
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              {nextDescription}
            </p>
          </div>

          <div className="foresight-gate-access-list">
            {[
              ['로그인 연결', isForesightHandoffConfigured() ? '준비됨' : '가입 요청 필요'],
              ['사용 범위', '성과 예측과 기준 데이터'],
              ['계정 확인', loginState === 'handoff_disabled' ? '사용 권한 확인' : 'AdMate 계정'],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {primaryActionHref ? (
              <a
                href={primaryActionHref}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-teal-950 active:scale-[0.98]"
              >
                {loginCopy.primaryAction}
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white opacity-55"
              >
                {loginCopy.primaryAction}
              </button>
            )}
            <Link
              href="/reset-password"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-teal-700/30 hover:bg-teal-50/60 active:scale-[0.98]"
            >
              비밀번호 재설정
            </Link>
          </div>

          <div className="space-y-3 rounded-xl border border-stone-200 bg-[#f7f7f2] p-4">
            <p className="text-sm font-bold text-slate-950">
              접근 권한이 없다면 AdMate 가입 요청
            </p>
            <p className="text-xs leading-5 text-stone-500">
              Foresight 사용 권한은 AdMate 가입 요청을 통해 확인합니다.
            </p>
            <a
              href={FORESIGHT_ACCESS_REQUEST_URL}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-teal-700/30 hover:bg-white active:scale-[0.98]"
            >
              AdMate 가입 요청
            </a>
            <a
              href="https://home.admate.ai.kr"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-stone-500 transition-colors hover:text-slate-950"
            >
              AdMate 홈페이지로 이동
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-xs leading-5 text-stone-500">
              {primaryActionHref ? loginCopy.helper : '로그인 연결이 아직 준비되지 않았습니다.'}
            </p>
            {loginCopy.notice ? (
              <p className={`text-xs leading-5 ${noticeToneClass}`}>
                {loginCopy.notice}
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
