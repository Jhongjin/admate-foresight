import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const files = {
  kpiCard: path.join(root, 'components', 'KPICard.tsx'),
  planningStatePanel: path.join(root, 'components', 'PlanningStatePanel.tsx'),
  simulator: path.join(root, 'app', 'SimulatorPageClient.tsx'),
  simulatorDecisionViewModel: path.join(root, 'lib', 'foresightSimulatorDecisionViewModel.ts'),
  simulatorKpiBenchmarkViewModel: path.join(root, 'lib', 'foresightSimulatorKpiBenchmarkViewModel.ts'),
  viewModel: path.join(root, 'lib', 'benchmark', 'uiStateViewModel.ts'),
  uiRenderingTest: path.join(root, 'tests', 'benchmark', 'benchmark-ui-state-rendering.test.tsx'),
  routeGuardTest: path.join(root, 'tests', 'benchmark', 'benchmark-route-output-guards.test.ts'),
}

const forbiddenKpiSnippets = [
  'fetch(',
  'process.env',
  'createClient',
  'supabase',
  '@supabase',
  'meta-ads',
  'google-ads',
  'py-predict',
  'py-retrain',
  'benchmark-dry-run',
  'dryRunHarness',
  'buildForesightBenchmarkUiStateFixtures',
  'buildBenchmarkRouteOutputGuardResults',
  'app/api',
  '/api/',
  'window.localStorage',
  'document.cookie',
]

const requiredKpiSnippets = [
  'benchmarkStatusLabel?: string',
  'benchmarkBasisLines?: string[]',
  'benchmarkConfidenceLabel?: string',
  'benchmarkVisibleCopy?: string[]',
  'benchmarkSyntheticContextLabel?: string',
  'benchmarkBlockedOutputs?: string[]',
  'benchmarkBasisLines = []',
  'benchmarkVisibleCopy = []',
  'benchmarkBlockedOutputs = []',
  'const hasBenchmarkDisplay = !loading && Boolean(',
  'aria-label={`${title} 벤치마크 신뢰도 세부 정보`}',
  'aria-label={`벤치마크 상태: ${benchmarkStatusLabel}`}',
  'aria-label={`벤치마크 신뢰도: ${benchmarkConfidenceLabel}`}',
  'aria-label={`${title} 벤치마크 안내`}',
  'aria-label={`${title} 벤치마크 기준`}',
  'aria-label={`${title} 제한된 벤치마크 출력`}',
  '제한된 출력',
]

const requiredViewModelSnippets = [
  "'benchmark-ready'",
  "'low-confidence'",
  "'long-term-trend-only'",
  "'validation-error'",
  "'security-review-required'",
  "'raw-identifier-risk'",
  "'no-benchmark-data'",
  '플랫폼:',
  '목표:',
  '지표:',
  '기간:',
  '검토 기준:',
  '표본 범위:',
  '통화 기준:',
  "syntheticContextLabel: '로컬 검증용 예시 데이터'",
  'reportReady: false',
  'promotionReady: false',
]

const requiredPlanningStatePanelSnippets = [
  'interface PlanningStatePanelSignal',
  'interface PlanningStatePanelStage',
  'interface PlanningStatePanelProps',
  'signals: PlanningStatePanelSignal[]',
  'stages?: PlanningStatePanelStage[]',
  'aria-label={title}',
  'border border-dashed border-stone-300',
  'grid gap-0 sm:grid-cols-3',
  'stages && stages.length > 0',
]

const requiredSimulatorSnippets = [
  'dataSufficiencyStatus',
  'dataSufficiencyLedger',
  'PlanningStatePanel',
  'buildForesightSimulatorKpiBenchmarkViewModel',
  'predictionRangeSpread',
  'predictionRangeRows',
  '예상 범위',
  '예산 곡선 기반 범위',
  '데이터 충분성 판정',
  '근거 보강 필요',
  '전체 기준으로 표시',
  '예산 곡선 대기',
  '보고서 출력은 검토용',
  '리포트/내보내기/승격/적용 준비 false',
  '확정 성과 표현 금지 원칙',
]

const requiredSimulatorKpiBenchmarkViewModelSnippets = [
  'buildForesightSimulatorKpiBenchmarkViewModel',
  'SimulatorKpiBenchmarkCardViewModel',
  'benchmarkStatusLabel',
  'benchmarkEvidenceLabel',
  'benchmarkBasisLines',
  'benchmarkBlockedOutputs',
  '시뮬레이션 후 기준 확인',
  '업종 매칭 벤치마크',
  '전체 기준 벤치마크',
  '업종 특화 평균처럼 표시하지 않음',
  '확정 성과가 아닌 매체 집행 확인',
]

const requiredUiTestSnippets = [
  'REQUIRED_RENDER_CONCEPTS',
  'buildForesightBenchmarkUiStateFixtures()',
  'buildBenchmarkUiStateViewModel',
  'KPICard',
  '벤치마크 상태:',
  '벤치마크 신뢰도 세부 정보',
  '벤치마크 기준',
  '제한된 벤치마크 출력',
  'report ready:\\s*true',
  'promotion ready:\\s*true',
  '로컬 검증용 예시 데이터',
  'toHaveClass',
  'break-words',
]

const requiredRouteGuardSnippets = [
  'FORBIDDEN_RENDERED_OUTPUTS',
  'buildBenchmarkRouteOutputGuardResults',
  'reportReady).toBe(false)',
  'promotionReady).toBe(false)',
  'unsafeFindings).toEqual([])',
  'acct_mock',
  'campaign_mock',
  'adset_mock',
  'ad_mock',
  'advertiser_mock',
  'credential_marker',
  'access[_-]?token',
  'sessionid',
  'cookie=',
  'https?:',
  '예측 임의 생성',
  '외부 생성 요청',
]

function fail(message) {
  console.error(`[check-benchmark-kpi-static-contract] ${message}`)
  process.exitCode = 1
}

function readSource(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing ${path.relative(root, filePath)}`)
    return ''
  }

  return fs.readFileSync(filePath, 'utf8')
}

function assertIncludes(source, expected, context) {
  if (!source.includes(expected)) fail(`${context} missing ${expected}`)
}

function assertDoesNotInclude(source, forbidden, context) {
  if (source.includes(forbidden)) fail(`${context} must not include ${forbidden}`)
}

const kpiSource = readSource(files.kpiCard)
for (const expected of requiredKpiSnippets) {
  assertIncludes(kpiSource, expected, 'KPICard static contract')
}
for (const forbidden of forbiddenKpiSnippets) {
  assertDoesNotInclude(kpiSource, forbidden, 'KPICard presentational boundary')
}

const viewModelSource = readSource(files.viewModel)
for (const expected of requiredViewModelSnippets) {
  assertIncludes(viewModelSource, expected, 'benchmark view model contract')
}
for (const forbidden of ['fetch(', 'process.env', 'createClient', '@supabase', '/api/', 'py-retrain']) {
  assertDoesNotInclude(viewModelSource, forbidden, 'benchmark view model local-only boundary')
}

const planningStatePanelSource = readSource(files.planningStatePanel)
for (const expected of requiredPlanningStatePanelSnippets) {
  assertIncludes(planningStatePanelSource, expected, 'PlanningStatePanel state surface contract')
}
for (const forbidden of ['fetch(', 'process.env', 'createClient', '@supabase', '/api/', 'document.cookie']) {
  assertDoesNotInclude(planningStatePanelSource, forbidden, 'PlanningStatePanel presentational boundary')
}

const simulatorSource = readSource(files.simulator)
const simulatorDecisionViewModelSource = readSource(files.simulatorDecisionViewModel)
const simulatorKpiBenchmarkViewModelSource = readSource(files.simulatorKpiBenchmarkViewModel)
const simulatorContractSource = `${simulatorSource}\n${simulatorDecisionViewModelSource}\n${simulatorKpiBenchmarkViewModelSource}`
for (const expected of requiredSimulatorSnippets) {
  assertIncludes(simulatorContractSource, expected, 'Simulator data sufficiency contract')
}
assertDoesNotInclude(simulatorSource, '내보내기 허용', 'Simulator forecast readiness contract')
for (const forbidden of ['fetch(', 'process.env', 'createClient', '@supabase', '/api/', 'document.cookie']) {
  assertDoesNotInclude(simulatorDecisionViewModelSource, forbidden, 'Simulator decision view model local-only boundary')
}
for (const expected of requiredSimulatorKpiBenchmarkViewModelSnippets) {
  assertIncludes(simulatorKpiBenchmarkViewModelSource, expected, 'Simulator KPI benchmark view model contract')
}
for (const forbidden of ['fetch(', 'process.env', 'createClient', '@supabase', '/api/', 'document.cookie']) {
  assertDoesNotInclude(simulatorKpiBenchmarkViewModelSource, forbidden, 'Simulator KPI benchmark view model local-only boundary')
}
for (const forbidden of ['sourceRows', 'accountId', 'campaignId', 'adsetId', 'adId', 'providerId']) {
  assertDoesNotInclude(simulatorKpiBenchmarkViewModelSource, forbidden, 'Simulator KPI benchmark aggregate-only boundary')
}

const uiTestSource = readSource(files.uiRenderingTest)
for (const expected of requiredUiTestSnippets) {
  assertIncludes(uiTestSource, expected, 'benchmark UI rendering coverage')
}

const routeGuardSource = readSource(files.routeGuardTest)
for (const expected of requiredRouteGuardSnippets) {
  assertIncludes(routeGuardSource, expected, 'benchmark route output guard coverage')
}

if (!process.exitCode) {
  console.log('[check-benchmark-kpi-static-contract] ok')
}
