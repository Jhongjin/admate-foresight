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
  description: 'AdMate Foresight를 사용하려면 AdMate 계정으로 로그인하세요.',
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
      return '계정 사용 상태 화면으로 돌아갑니다.';
    default:
      return '성과 예측 시뮬레이터로 돌아갑니다.';
  }
}

const forecastSignals = [
  { label: 'AdMate 기준 데이터', value: '최근 6개월', detail: '업종과 매체 기준을 먼저 선택합니다.' },
  { label: '입력 항목', value: '예산 / 기간', detail: '목표 KPI와 집행 조건을 함께 봅니다.' },
  { label: '결과 범위', value: '예측 구간', detail: '예상 성과와 데이터가 부족한 경우를 구분해 보여줍니다.' },
] as const;

const destinationCards = [
  { label: '성과 예측', title: '예산별 예측 범위', detail: '예산, 기간, KPI를 조정해 예상 성과 범위를 확인합니다.' },
  { label: '기준 데이터', title: '최근 6개월 비교 기준', detail: '업종과 매체 흐름을 AdMate 기준 데이터로 함께 검토합니다.' },
  { label: '데이터 충분성', title: '근거 상태 확인', detail: '표본과 예측 근거가 부족한 경우를 별도로 구분합니다.' },
] as const;

const sampleStatusLegend = [
  { label: '표본 충분', detail: '업종 매칭 기준', tone: 'ok' },
  { label: '주의', detail: '전체 기준 검토', tone: 'watch' },
  { label: '부족', detail: '조건 재검토', tone: 'risk' },
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
  const renderedPrimaryActionHref = primaryActionHref ?? FORESIGHT_ACCESS_REQUEST_URL;
  const renderedPrimaryActionLabel = primaryActionHref
    ? loginCopy.primaryAction
    : 'Foresight 이용 권한 요청';
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
                로그인 후 보려던 분석 화면으로 돌아갑니다. 로그인 전에는 분석 결과와 비교 기준 데이터를 표시하지 않습니다.
              </p>
            </div>
            <div className="foresight-gate-stamp" aria-hidden="true">
              <span>AF</span>
              <strong>Predict</strong>
            </div>
          </div>

          <div className="foresight-gate-mobile-action">
            <a
              href={renderedPrimaryActionHref}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-teal-950 active:scale-[0.98]"
            >
              {renderedPrimaryActionLabel}
            </a>
            <p>{primaryActionHref ? loginCopy.helper : 'Foresight 사용이 필요하다면 Foresight 이용 권한 요청을 진행해 주세요.'}</p>
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
              <h2>AdMate Foresight 성과 예측</h2>
              <span>
                예측 결과와 AdMate 기준 데이터, 표본 상태를 한 화면에서 함께 확인합니다.
              </span>
              <div className="foresight-gate-sample-legend" aria-label="데이터 충분성 상태">
                {sampleStatusLegend.map((item) => (
                  <div key={item.label} data-tone={item.tone}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
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
        </div>

        <aside className="foresight-gate-action">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              로그인 후 이동
            </p>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950">
              성과 예측 화면으로 이동
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              {nextDescription}
            </p>
          </div>

          <div className="foresight-gate-access-list">
            {[
              ['로그인 상태', isForesightHandoffConfigured() ? '로그인 가능' : '권한 요청 필요'],
              ['사용 범위', '성과 예측과 AdMate 기준 데이터'],
              ['계정 확인', loginState === 'handoff_disabled' ? '사용 권한 확인' : 'AdMate 계정'],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="foresight-gate-email-check" aria-label="회사 이메일 로그인 안내">
            <span>계정 안내</span>
            <p>회사 이메일 계정으로 AdMate 로그인을 진행합니다.</p>
          </div>

          <div className="foresight-gate-desktop-primary-action">
            <a
              href={renderedPrimaryActionHref}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-teal-950 active:scale-[0.98]"
            >
              {renderedPrimaryActionLabel}
            </a>
          </div>

          <div className="space-y-3 rounded-xl border border-stone-200 bg-[#f7f7f2] p-4">
            <p className="text-sm font-bold text-slate-950">
              Foresight 이용 권한이 필요하신가요?
            </p>
            <p className="text-xs leading-5 text-stone-500">
              Foresight 사용 권한은 Foresight 이용 권한 요청을 통해 확인합니다.
            </p>
            <a
              href={FORESIGHT_ACCESS_REQUEST_URL}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-teal-700/30 hover:bg-white active:scale-[0.98]"
            >
              Foresight 이용 권한 요청
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
              {primaryActionHref ? loginCopy.helper : 'Foresight 사용이 필요하다면 Foresight 이용 권한 요청을 진행해 주세요.'}
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
