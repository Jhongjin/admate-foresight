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
    primaryAction: 'AdMate로 로그인',
    helper: 'AdMate 로그인 후 요청한 Foresight 화면으로 돌아갑니다.',
  },
  session_expired: {
    title: '로그인이 만료되었습니다',
    body: '보안을 위해 Foresight 접속이 종료되었습니다. 다시 로그인하면 요청한 분석 화면으로 돌아갑니다.',
    primaryAction: 'AdMate로 로그인',
    helper: '다시 로그인한 뒤 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '보안을 위해 다시 로그인이 필요합니다.',
    noticeTone: 'danger',
  },
  session_invalid: {
    title: '다시 로그인이 필요합니다',
    body: '현재 Foresight 접속 상태를 확인할 수 없습니다. AdMate 계정으로 다시 로그인해 주세요.',
    primaryAction: 'AdMate로 로그인',
    helper: '다시 로그인한 뒤 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '접속 상태를 확인할 수 없습니다.',
    noticeTone: 'danger',
  },
  handoff_expired: {
    title: '로그인 확인이 만료되었습니다',
    body: '보안을 위해 로그인 확인 시간이 지났습니다. AdMate에서 Foresight를 다시 열어 주세요.',
    primaryAction: 'AdMate로 로그인',
    helper: 'AdMate에서 Foresight를 다시 열면 요청한 화면으로 돌아갑니다.',
    notice: '로그인 확인 시간이 지났습니다.',
    noticeTone: 'danger',
  },
  handoff_invalid: {
    title: 'Foresight 로그인 상태를 확인할 수 없습니다',
    body: '로그인을 완료하지 못했습니다. AdMate에서 다시 시작하거나 이용 권한을 문의해 주세요.',
    primaryAction: 'AdMate로 로그인',
    helper: 'AdMate에서 다시 시작한 뒤 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '로그인 요청을 완료할 수 없습니다.',
    noticeTone: 'danger',
  },
  handoff_disabled: {
    title: 'AdMate 이용 권한 확인이 필요합니다',
    body: '현재 계정에는 Foresight 사용 권한이 아직 확인되지 않았습니다. AdMate 이용 권한 요청에서 Foresight 사용 권한을 신청할 수 있습니다.',
    primaryAction: 'AdMate로 로그인',
    helper: 'AdMate 계정으로 로그인하면 Foresight 권한 상태를 다시 확인합니다.',
    notice: 'Foresight 사용 권한 확인이 필요합니다.',
    noticeTone: 'danger',
  },
  logout_complete: {
    title: 'AdMate Foresight 성과 예측',
    body: '로그아웃되었습니다. 성과 예측과 비교 기준 데이터를 다시 보려면 AdMate 계정으로 로그인하세요.',
    primaryAction: 'AdMate로 로그인',
    helper: 'AdMate 로그인 후 요청한 Foresight 화면으로 돌아갑니다.',
    notice: '로그아웃되었습니다.',
    noticeTone: 'neutral',
  },
} satisfies Record<ForesightLoginState, ForesightLoginCopy>;

export const FORESIGHT_ACCOUNT_ACCESS_COPY = {
  active: {
    title: '계정 및 사용 상태',
    body: '현재 Foresight 접근 상태가 확인되었습니다. 성과 예측 화면으로 돌아가거나 필요한 계획 화면을 열 수 있습니다.',
    statusLabel: '조회 가능',
    productSummary: '성과 예측 화면 접근',
    roleSummary: '이용 권한 확인됨',
    workspaceSummary: '표시 이름 확인 필요',
    primaryAction: '성과 예측으로 돌아가기',
    secondaryAction: '이용 권한 문의',
  },
  access_denied: {
    title: 'Foresight 사용 권한이 없습니다',
    body: 'AdMate 계정은 확인되었지만 현재 계정에서 Foresight 성과 예측 화면 접근이 아직 확인되지 않았습니다.',
    statusLabel: '접근 제한',
    productSummary: '성과 예측 화면 접근 필요',
    roleSummary: '이용 권한 확인 필요',
    workspaceSummary: '계정 정보 확인 필요',
    primaryAction: 'AdMate 이용 권한 요청',
    secondaryAction: 'AdMate로 돌아가기',
  },
  entitlement_disabled: {
    title: 'Foresight 사용이 비활성화되어 있습니다',
    body: '현재 계정에서 Foresight 성과 예측 화면 접근이 보류되어 있습니다. 이용을 재개하려면 AdMate 관리자에게 문의해 주세요.',
    statusLabel: '접근 보류',
    productSummary: '성과 예측 화면 접근 보류',
    roleSummary: '이용 권한 확인 필요',
    workspaceSummary: '운영 설정 확인 필요',
    primaryAction: '이용 상태 문의',
    secondaryAction: 'AdMate로 돌아가기',
  },
  role_pending: {
    title: '역할 확인이 필요합니다',
    body: 'Foresight 성과 예측 화면을 이용할 권한 확인이 아직 완료되지 않았습니다. AdMate 관리자에게 확인을 요청해 주세요.',
    statusLabel: '권한 확인 필요',
    productSummary: '성과 예측 화면 접근 필요',
    roleSummary: '이용 권한 확인 대기',
    workspaceSummary: '계정 정보 확인됨',
    primaryAction: '이용 권한 문의',
    secondaryAction: 'AdMate로 돌아가기',
  },
  workspace_unavailable: {
    title: '사용 환경을 확인할 수 없습니다',
    body: '현재 계정 표시 정보를 확인할 수 없습니다. 다시 로그인하거나 이용 상태를 문의해 주세요.',
    statusLabel: '계정 확인 필요',
    productSummary: 'Foresight 접근 상태 확인 필요',
    roleSummary: '이용 권한 확인 필요',
    workspaceSummary: '표시 이름 확인 필요',
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
