export type ForesightLoginState =
  | 'missing_session'
  | 'session_expired'
  | 'session_invalid'
  | 'handoff_expired'
  | 'handoff_invalid'
  | 'handoff_disabled'
  | 'logout_complete';

export type ForesightAccountAccessState =
  | 'active'
  | 'access_denied'
  | 'entitlement_disabled'
  | 'role_pending'
  | 'workspace_unavailable';

export interface ForesightLoginCopy {
  title: string;
  body: string;
  primaryAction: string;
  helper: string;
  notice?: string;
  noticeTone?: 'neutral' | 'danger';
}

export interface ForesightAccountAccessCopy {
  title: string;
  body: string;
  statusLabel: string;
  productSummary: string;
  roleSummary: string;
  workspaceSummary: string;
  primaryAction: string;
  secondaryAction: string;
}

type SearchParams = Record<string, string | string[] | undefined> | undefined;

const loginCopy = {
  missing_session: {
    title: 'AdMate Foresight 성과 예측',
    body: '성과 예측과 비교 기준 데이터를 확인하고, 데이터가 부족한 경우를 구분하려면 AdMate 계정으로 로그인하세요.',
    primaryAction: 'AdMate 계정으로 계속',
    helper: 'AdMate 로그인 후 요청한 Foresight 화면으로 돌아갑니다.',
  },
  session_expired: {
    title: '세션이 만료되었습니다',
    body: '보안을 위해 Foresight 접속이 종료되었습니다. 다시 로그인하면 요청한 분석 화면으로 돌아갑니다.',
    primaryAction: '다시 로그인',
    helper: '다시 로그인한 뒤 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '보안을 위해 다시 로그인이 필요합니다.',
    noticeTone: 'danger',
  },
  session_invalid: {
    title: '다시 로그인이 필요합니다',
    body: '현재 Foresight 접속 상태를 확인할 수 없습니다. AdMate 계정으로 다시 로그인해 주세요.',
    primaryAction: '다시 로그인',
    helper: '다시 로그인한 뒤 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '접속 상태를 확인할 수 없습니다.',
    noticeTone: 'danger',
  },
  handoff_expired: {
    title: '로그인 확인이 만료되었습니다',
    body: '보안을 위해 로그인 확인 시간이 지났습니다. AdMate에서 Foresight를 다시 열어 주세요.',
    primaryAction: 'AdMate 계정으로 계속',
    helper: 'AdMate에서 Foresight를 다시 열면 요청한 화면으로 돌아갑니다.',
    notice: '로그인 확인 시간이 지났습니다.',
    noticeTone: 'danger',
  },
  handoff_invalid: {
    title: 'Foresight 로그인 상태를 확인할 수 없습니다',
    body: 'Foresight 로그인 요청을 완료할 수 없습니다. AdMate에서 다시 시작하거나 사용 권한을 문의해 주세요.',
    primaryAction: 'AdMate 계정으로 계속',
    helper: 'AdMate에서 다시 시작한 뒤 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '로그인 요청을 완료할 수 없습니다.',
    noticeTone: 'danger',
  },
  handoff_disabled: {
    title: '현재 Foresight 로그인을 사용할 수 없습니다',
    body: '현재 환경에서는 Foresight 로그인을 사용할 수 없습니다. 사용 권한이 필요하면 AdMate 이용 권한 요청을 진행해 주세요.',
    primaryAction: 'AdMate 이용 권한 요청',
    helper: 'Foresight 사용 권한은 AdMate 이용 권한 요청으로 확인합니다.',
    notice: 'Foresight 로그인을 사용할 수 없습니다.',
    noticeTone: 'danger',
  },
  logout_complete: {
    title: 'AdMate Foresight 성과 예측',
    body: '로그아웃되었습니다. 성과 예측과 비교 기준 데이터를 다시 보려면 AdMate 계정으로 로그인하세요.',
    primaryAction: 'AdMate 계정으로 계속',
    helper: 'AdMate 로그인 후 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '로그아웃되었습니다.',
    noticeTone: 'neutral',
  },
} satisfies Record<ForesightLoginState, ForesightLoginCopy>;

export const FORESIGHT_ACCOUNT_ACCESS_COPY = {
  active: {
    title: '계정 및 사용 상태',
    body: '현재 Foresight 사용이 활성화되어 있습니다. 분석 화면으로 돌아가거나 필요한 보조 화면을 열 수 있습니다.',
    statusLabel: '사용 가능',
    productSummary: 'Foresight 사용 가능',
    roleSummary: '역할 정보 없음',
    workspaceSummary: '표시 가능한 이름 없음',
    primaryAction: '성과 예측으로 돌아가기',
    secondaryAction: '사용 권한 문의',
  },
  access_denied: {
    title: 'Foresight 사용 권한이 없습니다',
    body: 'AdMate 계정은 확인되었지만 현재 계정 또는 역할에는 Foresight 사용이 활성화되어 있지 않습니다.',
    statusLabel: '사용 제한',
    productSummary: 'Foresight 사용 권한 필요',
    roleSummary: '사용 가능한 역할 없음',
    workspaceSummary: '사용 권한 확인 필요',
    primaryAction: 'Foresight 사용 권한 문의',
    secondaryAction: 'AdMate로 돌아가기',
  },
  entitlement_disabled: {
    title: 'Foresight 사용이 비활성화되어 있습니다',
    body: '현재 사용 환경에서는 Foresight 사용이 비활성화되어 있습니다. 다시 사용하려면 AdMate 관리자에게 문의해 주세요.',
    statusLabel: '사용 비활성화',
    productSummary: 'Foresight 비활성화',
    roleSummary: '역할 확인 필요',
    workspaceSummary: '사용 환경 설정 확인 필요',
    primaryAction: '사용 상태 문의',
    secondaryAction: 'AdMate로 돌아가기',
  },
  role_pending: {
    title: '역할 확인이 필요합니다',
    body: 'Foresight를 사용할 역할이 아직 지정되지 않았습니다. AdMate 관리자에게 역할 설정을 요청해 주세요.',
    statusLabel: '역할 확인 필요',
    productSummary: 'Foresight 역할 필요',
    roleSummary: '역할 지정 대기',
    workspaceSummary: '사용 환경 확인됨',
    primaryAction: '역할 설정 문의',
    secondaryAction: 'AdMate로 돌아가기',
  },
  workspace_unavailable: {
    title: '사용 환경을 확인할 수 없습니다',
    body: '현재 표시 가능한 사용 환경 정보를 확인할 수 없습니다. 다시 로그인하거나 사용 상태를 문의해 주세요.',
    statusLabel: '사용 환경 확인 필요',
    productSummary: 'Foresight 사용 상태 확인 필요',
    roleSummary: '역할 표시 불가',
    workspaceSummary: '표시 가능한 사용 환경 없음',
    primaryAction: '다시 로그인',
    secondaryAction: '사용 권한 문의',
  },
} satisfies Record<ForesightAccountAccessState, ForesightAccountAccessCopy>;

function firstQueryValue(raw: unknown): string | undefined {
  if (Array.isArray(raw)) return typeof raw[0] === 'string' ? raw[0] : undefined;
  return typeof raw === 'string' ? raw : undefined;
}

export function resolveForesightLoginState(params: SearchParams): ForesightLoginState {
  const handoff = firstQueryValue(params?.handoff);
  if (handoff === 'expired') return 'handoff_expired';
  if (handoff === 'invalid') return 'handoff_invalid';
  if (handoff === 'disabled') return 'handoff_disabled';

  const state = firstQueryValue(params?.state);
  if (state === 'session_expired') return 'session_expired';
  if (state === 'session_invalid') return 'session_invalid';
  if (state === 'logout_complete') return 'logout_complete';

  const logout = firstQueryValue(params?.logout);
  if (logout === 'complete' || logout === '1' || logout === 'true') return 'logout_complete';

  return 'missing_session';
}

export function getForesightLoginCopy(state: ForesightLoginState): ForesightLoginCopy {
  return loginCopy[state];
}
