import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ForesightTextMaterialCanvas from './ForesightTextMaterialCanvas';
import ReactiveHeadline from '@/components/ReactiveHeadline';
import { getForesightLoginCopy, resolveForesightLoginState } from '@/lib/auth/foresightAccessCopy';
import {
  buildForesightCoreProductLoginUrl,
  FORESIGHT_ACCESS_REQUEST_URL,
  sanitizeForesightNextPath,
} from '@/lib/auth/foresightAuth';
import {
  hasValidForesightSession,
} from '@/lib/auth/foresightSession';

export const metadata: Metadata = {
  title: 'AdMate Foresight 로그인',
  description: 'AdMate Foresight를 사용하려면 AdMate 계정으로 로그인하세요.',
};

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const forecastSignals = [
  { label: 'AdMate 기준 데이터', value: '최근 최대 6개월', detail: '업종과 매체 기준을 먼저 선택합니다.' },
  { label: '입력 항목', value: '예산 / 기간', detail: '목표 KPI와 집행 조건을 함께 봅니다.' },
  { label: '결과 범위', value: '예측 구간', detail: '예상 성과와 데이터가 부족한 경우를 구분해 보여줍니다.' },
] as const;

const gateHeadline = '집행 전 성과 범위를 먼저 가늠합니다';
const gateSubcopy =
  '업종, 매체, 예산, 기간 조건을 기준 데이터와 비교해 예상 성과 범위와 예측 보류 사유를 함께 확인합니다.';

const destinationCards = [
  { label: '성과 예측', title: '예측 보류 상태', detail: '표본 또는 기준이 부족하면 결과 대신 보류 사유를 먼저 표시합니다.' },
  { label: '기준 데이터', title: '기준 데이터 없음', detail: '업종과 매체 기준이 비어 있으면 비교 기준을 명확히 안내합니다.' },
  { label: '데이터 충분성', title: '표본 부족 확인', detail: '최소 표본에 미달하는 조건은 별도 상태로 구분합니다.' },
] as const;

const forecastReadinessRows = [
  {
    label: '표본 부족',
    value: '18 / 30건',
    detail: '업종·매체 매칭 수가 기준보다 낮으면 예측값을 숨깁니다.',
    tone: 'risk',
  },
  {
    label: '기준 데이터 없음',
    value: '비교 기준 미선택',
    detail: '기준 기간 데이터가 없으면 벤치마크를 먼저 다시 확인합니다.',
    tone: 'empty',
  },
  {
    label: '예측 보류',
    value: '로그인 후 산출',
    detail: '권한 확인 뒤 충분한 기준이 모일 때 예측 구간을 표시합니다.',
    tone: 'hold',
  },
] as const;

const loginErrorMessages: Record<string, string> = {
  account_not_allowed: '요청한 제품 접근 권한을 확인할 수 없습니다.',
  handoff_disabled: 'AdMate 로그인 연결이 아직 활성화되지 않았습니다. 담당자에게 문의해주세요.',
  handoff_unavailable: '로그인 연결을 준비할 수 없습니다. 잠시 후 다시 시도해주세요.',
  invalid_credentials: '계정 정보를 확인해주세요.',
  missing_credentials: '이메일과 비밀번호를 입력해주세요.',
  origin_not_allowed: '로그인 요청 경로를 확인해주세요.',
  rate_limited: '로그인 요청이 많습니다. 잠시 후 다시 시도해주세요.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeForesightNextPath(params?.next);
  if (await hasValidForesightSession()) {
    redirect(nextPath);
  }

  const loginState = resolveForesightLoginState(params);
  const loginCopy = getForesightLoginCopy(loginState);
  const coreProductLoginUrl = buildForesightCoreProductLoginUrl();
  const loginError = Array.isArray(params?.login_error) ? params?.login_error[0] : params?.login_error;
  const loginErrorMessage = loginError
    ? loginErrorMessages[loginError] ?? '계정 정보를 확인해주세요.'
    : null;

  return (
    <div className="foresight-login-stage min-h-[calc(100dvh-9rem)] py-8 sm:py-10">
      <section className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,390px)] xl:grid-cols-[minmax(0,1.08fr)_430px]">
        <div className="foresight-gate-brief">
          <div className="foresight-gate-pill-row" aria-label="Foresight 서비스 정보">
            <span>FORESIGHT.ADMATE.AI.KR</span>
            <span>성과 예측</span>
          </div>

          <div className="foresight-gate-head">
            <div>
              <ReactiveHeadline className="foresight-gate-title">
                {gateHeadline}
              </ReactiveHeadline>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                {gateSubcopy}
              </p>
            </div>
            <dl className="foresight-gate-stamp" aria-label="예측 기준 요약">
              <div>
                <dt>기준 기간</dt>
                <dd>최근 최대 6개월</dd>
              </div>
              <div>
                <dt>표본</dt>
                <dd>최소 30건</dd>
              </div>
              <div>
                <dt>예측 구간</dt>
                <dd>권한 확인 후</dd>
              </div>
            </dl>
          </div>

          <div className="foresight-gate-mobile-action">
            <a
              href="#foresight-login-form"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-teal-950 active:scale-[0.98]"
            >
              로그인하고 계속
            </a>
            <p>{loginCopy.helper}</p>
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
              <span className="foresight-gate-forecast-summary">
                예산 시뮬레이션 결과와 AdMate 기준 데이터, 표본 상태를 한 화면에서 함께 확인합니다.
              </span>
              <div className="foresight-gate-status-board" aria-label="데이터 부족 상태">
                {forecastReadinessRows.map((item) => (
                  <article key={item.label} data-tone={item.tone}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="foresight-gate-chart" aria-label="예측 보류 상태 미리보기">
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
                <span>예측 상태</span>
                <strong>예측 보류</strong>
              </div>
              <div className="foresight-gate-chart-state-card">
                <p>예측 보류</p>
                <strong>기준 데이터 확인 필요</strong>
                <span>
                  표본 부족 또는 기준 데이터 없음 상태에서는 결과 대신 보류 사유를 먼저 표시합니다.
                </span>
              </div>
              <div className="foresight-gate-chart-readiness">
                {forecastReadinessRows.slice(0, 2).map((item) => (
                  <div key={item.label} data-tone={item.tone}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
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

        <div className="foresight-gate-action-stack">
          <aside className="foresight-gate-action">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                AdMate Foresight
              </p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950">
                {loginCopy.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-500">
                {loginCopy.body}
              </p>
            </div>

            {loginCopy.notice ? (
              <div
                className={`rounded-lg border p-3 text-sm font-semibold ${
                  loginCopy.noticeTone === 'danger'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-stone-200 bg-stone-50 text-stone-600'
                }`}
              >
                {loginCopy.notice}
              </div>
            ) : null}

            <form id="foresight-login-form" action={coreProductLoginUrl} method="post" className="space-y-5">
              <input type="hidden" name="product" value="foresight" />
              <input type="hidden" name="next" value={nextPath} />
            <div className="foresight-gate-account-block" aria-label="Foresight 로그인 정보">
              <div className="foresight-gate-field">
                <label htmlFor="foresight-account-preview">이메일</label>
                <div className="foresight-gate-email-field">
                  <input
                    id="foresight-account-preview"
                    name="email_local_part"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    required
                    placeholder="name"
                    aria-describedby="foresight-email-domain foresight-login-helper"
                  />
                  <span id="foresight-email-domain">@nasmedia.co.kr</span>
                </div>
              </div>
              <div className="foresight-gate-field">
                <label htmlFor="foresight-password-preview">비밀번호</label>
                <input
                  id="foresight-password-preview"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="비밀번호를 입력하세요"
                  className="foresight-gate-password-field"
                  aria-describedby="foresight-login-helper"
                />
              </div>
              <p id="foresight-login-helper" className="foresight-gate-login-helper">
                AdMate 인증 화면에서 회사 계정을 확인합니다.
              </p>
            </div>
            {loginErrorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                {loginErrorMessage}
              </div>
            ) : null}

            <div className="foresight-gate-desktop-primary-action">
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-teal-950 active:scale-[0.98]"
              >
                로그인하고 계속
              </button>
            </div>
            </form>

            <div className="space-y-3 rounded-lg border border-stone-200 bg-[#f7f7f2] p-4">
              <p className="text-sm font-bold text-slate-950">
                Foresight 이용 권한이 필요하신가요?
              </p>
              <p className="text-xs leading-5 text-stone-500">
                권한이 없거나 처음 이용하는 경우, AdMate에서 Foresight 이용 권한을 요청해주세요.
              </p>
              <a
                href={FORESIGHT_ACCESS_REQUEST_URL}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-teal-700/30 hover:bg-white active:scale-[0.98]"
              >
                AdMate 이용 권한 요청
              </a>
              <a
                href="https://home.admate.ai.kr"
                className="inline-flex w-full items-center justify-center text-sm font-semibold text-stone-500 transition-colors hover:text-slate-950"
              >
                AdMate 홈페이지로 이동
              </a>
            </div>
          </aside>

          <ForesightTextMaterialCanvas />
        </div>
      </section>
    </div>
  );
}
