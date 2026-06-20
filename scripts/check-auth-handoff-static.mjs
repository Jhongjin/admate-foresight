import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const file = (...parts) => path.join(root, ...parts)
const rel = (target) => path.relative(root, target).replaceAll(path.sep, '/')

const files = {
  auth: file('lib', 'auth', 'foresightAuth.ts'),
  accessCopy: file('lib', 'auth', 'foresightAccessCopy.ts'),
  pageGuard: file('lib', 'auth', 'foresightPageGuard.ts'),
  session: file('lib', 'auth', 'foresightSession.ts'),
  handoffRoute: file('app', 'auth', 'handoff', 'route.ts'),
  loginPage: file('app', 'login', 'page.tsx'),
  accountPage: file('app', 'account', 'page.tsx'),
  homePage: file('app', 'page.tsx'),
  trendsPage: file('app', 'trends', 'page.tsx'),
  insightsPage: file('app', 'insights', 'page.tsx'),
  competitorPage: file('app', 'competitor', 'page.tsx'),
}

const protectedPages = [
  [files.homePage, '/'],
  [files.trendsPage, '/trends'],
  [files.insightsPage, '/insights'],
  [files.competitorPage, '/competitor'],
  [files.accountPage, '/account'],
]

const allowedNextPaths = ['/', '/trends', '/insights', '/competitor', '/account']
const sensitiveQueryKeys = [
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'apikey',
  'secret',
  'password',
  'code',
  'otp',
  'session',
  'provider',
  'state',
]
const loginStates = [
  'missing_session',
  'session_expired',
  'session_invalid',
  'handoff_expired',
  'handoff_invalid',
  'handoff_disabled',
  'logout_complete',
]
const accountStates = [
  'active',
  'access_denied',
  'entitlement_disabled',
  'role_pending',
  'workspace_unavailable',
]
const requiredKoreanCopy = [
  'AdMate Foresight 성과 예측',
  '로그인이 만료되었습니다',
  '다시 로그인이 필요합니다',
  '로그인 확인이 만료되었습니다',
  'Foresight 로그인 상태를 확인할 수 없습니다',
  'AdMate 이용 권한 확인이 필요합니다',
  '계정 및 사용 상태',
  'Foresight 사용 권한이 없습니다',
  'Foresight 사용이 비활성화되어 있습니다',
  '역할 확인이 필요합니다',
  '사용 환경을 확인할 수 없습니다',
  'AdMate로 로그인',
  'AdMate 이용 권한 요청',
  '현재 계정에는 Foresight 사용 권한이 아직 확인되지 않았습니다',
]

let failed = false

function fail(message) {
  console.error(`[check-auth-handoff-static] ${message}`)
  failed = true
}

function read(target) {
  if (!fs.existsSync(target)) {
    fail(`missing ${rel(target)}`)
    return ''
  }

  return fs.readFileSync(target, 'utf8')
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) fail(`${label}: missing ${marker}`)
}

function assertNoIncludes(source, marker, label) {
  if (source.includes(marker)) fail(`${label}: must not include ${marker}`)
}

function assertOrder(source, before, after, label) {
  const beforeIndex = source.indexOf(before)
  const afterIndex = source.indexOf(after)
  if (beforeIndex === -1 || afterIndex === -1) {
    fail(`${label}: missing order marker`)
    return
  }

  if (beforeIndex >= afterIndex) fail(`${label}: ${before} must appear before ${after}`)
}

const authSource = read(files.auth)
const accessCopySource = read(files.accessCopy)
const pageGuardSource = read(files.pageGuard)
const sessionSource = read(files.session)
const handoffRouteSource = read(files.handoffRoute)
const loginPageSource = read(files.loginPage)
const accountPageSource = read(files.accountPage)

for (const nextPath of allowedNextPaths) {
  assertIncludes(authSource, `'${nextPath}'`, 'foresightAuth allowed next paths')
}

for (const key of sensitiveQueryKeys) {
  assertIncludes(authSource, `'${key}'`, 'foresightAuth sensitive query stripping')
}

for (const marker of [
  'MAX_NEXT_LENGTH = 512',
  "trimmed.startsWith('//')",
  "trimmed.includes('\\\\')",
  "parsed.origin !== FORESIGHT_NEXT_ORIGIN",
  "parsed.pathname === '/api'",
  "parsed.pathname.startsWith('/api/')",
  'search.delete(key)',
  'encodeURIComponent(next)',
  "product', FORESIGHT_PRODUCT_ID",
  "next', next",
  "FORESIGHT_AUTH_HANDOFF_ENABLED === 'true'",
]) {
  assertIncludes(authSource, marker, 'foresightAuth sanitization and handoff contract')
}

for (const state of loginStates) {
  assertIncludes(accessCopySource, state, 'login copy state coverage')
}

for (const state of accountStates) {
  assertIncludes(accessCopySource, state, 'account access copy state coverage')
}

for (const copy of requiredKoreanCopy) {
  assertIncludes(accessCopySource, copy, 'bounded Korean auth/access copy')
}

for (const marker of [
  'cookies()',
  'FORESIGHT_SESSION_COOKIE_NAME',
  'verifyForesightSessionCookie(sessionCookie)',
  'redirect(buildForesightLoginPath(path))',
]) {
  assertIncludes(pageGuardSource, marker, 'protected page guard fail-closed contract')
}

for (const [target, nextPath] of protectedPages) {
  const source = target === files.accountPage ? accountPageSource : read(target)
  assertIncludes(source, "requireForesightPageSession", `${rel(target)} protected route`)
  assertIncludes(source, `requireForesightPageSession('${nextPath}')`, `${rel(target)} protected route next path`)
}

for (const marker of [
  "export const dynamic = 'force-dynamic'",
  "cache-control', 'no-store, no-cache, max-age=0, must-revalidate'",
  "pragma', 'no-cache'",
  "expires', '0'",
  "referrer-policy', 'no-referrer'",
  'sanitizeForesightNextPath',
  "handoff=${status}",
  'clearForesightSessionCookie(response)',
  'isForesightHandoffConfigured()',
  'hasExactlyOneCodeQuery(request.nextUrl.searchParams)',
  "const codeValues = request.nextUrl.searchParams.getAll('code')",
  'isValidForesightHandoffCode(code)',
  'redeemForesightHandoffCode(code)',
  'resolveSiteSwitchReturnPath(request, session.returnPath)',
  'new URL(siteSwitchReturnPath, request.url)',
  "const loginUrl = new URL('/login', request.url)",
  "loginUrl.searchParams.set('next', session.returnPath)",
  "loginUrl.searchParams.set('auth', 'success')",
  'setForesightSessionCookie(response, session)',
  "redirectToLogin(request, fallbackNextPath, 'disabled')",
  "redirectToLogin(request, fallbackNextPath, 'invalid')",
  "redirectToLogin(request, fallbackNextPath, 'expired')",
]) {
  assertIncludes(handoffRouteSource, marker, 'handoff route fail-closed/no-store contract')
}

for (const [before, after, label] of [
  [
    'redeemForesightHandoffCode(code)',
    'resolveSiteSwitchReturnPath(request, session.returnPath)',
    'handoff route must redeem before resolving return path',
  ],
  [
    'resolveSiteSwitchReturnPath(request, session.returnPath)',
    "const loginUrl = new URL('/login', request.url)",
    'handoff route must prefer site-switch return before login success redirect',
  ],
  [
    "loginUrl.searchParams.set('auth', 'success')",
    'const response = NextResponse.redirect(loginUrl)',
    'handoff route must set success state before issuing login redirect',
  ],
]) {
  assertOrder(handoffRouteSource, before, after, label)
}

for (const marker of [
  'returnPath: string',
  'sanitizeForesightNextPath',
  'readString(payload.return_path)',
]) {
  assertIncludes(sessionSource, marker, 'session helpers must consume Core-stored return path')
}

for (const marker of [
  'resolveForesightLoginState(params)',
  'getForesightLoginCopy(loginState)',
  'sanitizeForesightNextPath(params?.next)',
  'buildForesightCoreStartUrl(nextPath)',
  'isForesightHandoffConfigured()',
  'FORESIGHT_ACCESS_REQUEST_URL',
  'AdMate 이용 권한 요청',
  'AdMate 홈페이지로 이동',
]) {
  assertIncludes(loginPageSource, marker, 'login page bounded handoff UX')
}

for (const marker of [
  'FORESIGHT_ACCOUNT_ACCESS_COPY.active',
  'sanitizeForesightNextPath(params?.next)',
  'FORESIGHT_ACCESS_REQUEST_URL',
  '접근 상태',
  '제품 접근',
  '역할',
  '작업 공간',
]) {
  assertIncludes(accountPageSource, marker, 'account page bounded access UX')
}

for (const marker of [
  'document.cookie',
  'localStorage',
  'sessionStorage',
  'dangerouslySetInnerHTML',
]) {
  assertNoIncludes(loginPageSource, marker, 'login page no client/session inspection')
  assertNoIncludes(accountPageSource, marker, 'account page no client/session inspection')
}

assertNoIncludes(
  loginPageSource,
  'cursor-not-allowed',
  'login page primary CTA must remain actionable',
)

for (const marker of [
  'console.log',
  'console.error',
]) {
  assertNoIncludes(handoffRouteSource, marker, 'handoff route must not log auth material')
  assertNoIncludes(sessionSource, marker, 'session helpers must not log auth material')
}

if (failed) {
  process.exitCode = 1
} else {
  console.log('[check-auth-handoff-static] ok')
}
