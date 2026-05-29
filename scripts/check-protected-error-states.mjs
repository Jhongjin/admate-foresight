import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const statePanelPath = path.join(root, 'components', 'StatePanel.tsx')
const competitorPath = path.join(root, 'app', 'competitor', 'CompetitorPageClient.tsx')
const simulatorPath = path.join(root, 'app', 'SimulatorPageClient.tsx')
const simulatorErrorHelperPath = path.join(root, 'lib', 'foresightSimulatorProductSafeErrorViewModel.ts')
const pyPredictRoutePath = path.join(root, 'app', 'api', 'py-predict', 'route.ts')
const protectedPages = [
  {
    label: 'trends',
    path: path.join(root, 'app', 'trends', 'TrendsPageClient.tsx'),
    fetches: ['/api/filters', '/api/trends?', '/api/breakdown?'],
    errorSetters: [
      'setFiltersError(true)',
      'setTrendError(true)',
      'setEfficiencyError(true)',
      'setGenderError(true)',
      'setAgeError(true)',
    ],
    requiredCopy: [
      '필터 정보를 불러오지 못했습니다',
      '효율 순위를 불러오지 못했습니다',
      '월별 추이 데이터를 불러오지 못했습니다',
      '성별 분포를 불러오지 못했습니다',
      '연령대별 분포를 불러오지 못했습니다',
    ],
  },
  {
    label: 'insights',
    path: path.join(root, 'app', 'insights', 'InsightsPageClient.tsx'),
    fetches: ['/api/insights', '/api/seasonality'],
    errorSetters: ['setFiltersError(true)', 'setSeasonError(true)'],
    requiredCopy: [
      '업종 필터를 불러오지 못했습니다',
      '시즌 이벤트 성과를 불러오지 못했습니다',
    ],
  },
]

const forbiddenRawErrorSnippets = [
  '.message}',
  '.message)',
  'String(error',
  'String(err',
  'JSON.stringify(error',
  'JSON.stringify(err',
  'response.statusText',
  'response.text()',
  'error.stack',
  'err.stack',
]

function fail(message) {
  console.error(`[check-protected-error-states] ${message}`)
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

const statePanelSource = readSource(statePanelPath)
assertIncludes(statePanelSource, "'loading' | 'empty' | 'error'", 'StatePanel variant contract')
assertIncludes(statePanelSource, "role={isError ? 'alert'", 'StatePanel error semantics')
assertIncludes(statePanelSource, "aria-live={isError ? 'assertive'", 'StatePanel error live region')
assertIncludes(statePanelSource, 'border-red-200', 'StatePanel error visual style')
assertIncludes(statePanelSource, 'ledger?: StatePanelLedgerItem[]', 'StatePanel analytics ledger contract')
assertIncludes(statePanelSource, 'nextActions?: string[]', 'StatePanel next action contract')

for (const page of protectedPages) {
  const source = readSource(page.path)
  const relative = path.relative(root, page.path)

  assertIncludes(source, "import StatePanel from '@/components/StatePanel'", relative)
  assertIncludes(source, 'function toJsonOrThrow(response: Response)', relative)
  assertIncludes(source, "throw new Error('request_failed')", relative)
  assertIncludes(source, '.then(toJsonOrThrow)', relative)
  assertIncludes(source, 'variant="error"', relative)

  for (const fetchPath of page.fetches) {
    assertIncludes(source, fetchPath, `${relative} fetch contract`)
  }

  for (const setter of page.errorSetters) {
    assertIncludes(source, setter, `${relative} error state`)
  }

  for (const copy of page.requiredCopy) {
    assertIncludes(source, copy, `${relative} bounded Korean error copy`)
  }

  for (const forbidden of forbiddenRawErrorSnippets) {
    if (source.includes(forbidden)) {
      fail(`${relative} must not render raw error details via ${forbidden}`)
    }
  }

  const consoleErrorCount = (source.match(/console\.error/g) || []).length
  if (consoleErrorCount > 0) {
    fail(`${relative} has console-only error handling`)
  }
}

const competitorSource = readSource(competitorPath)
assertIncludes(competitorSource, "import StatePanel from '@/components/StatePanel'", 'competitor common state panel')
assertIncludes(competitorSource, '/api/meta-ads-scrape?', 'competitor scrape fetch contract')
assertIncludes(competitorSource, 'const PRODUCT_SAFE_ERROR', 'competitor bounded error constant')
assertIncludes(competitorSource, 'setError(PRODUCT_SAFE_ERROR)', 'competitor product-safe error setter')
assertIncludes(competitorSource, 'variant="error"', 'competitor common error panel')
assertIncludes(competitorSource, '소재 수집 연결 상태를 확인하고 있습니다', 'competitor bounded Korean error copy')
assertIncludes(competitorSource, '소재 기준선이 비어 있습니다', 'competitor empty state copy')
assertIncludes(competitorSource, 'ledger={captureLedger.map', 'competitor empty/error ledger')
assertIncludes(competitorSource, '직접 입력 검색어', 'competitor keyword echo guard')

for (const forbidden of forbiddenRawErrorSnippets) {
  if (competitorSource.includes(forbidden)) {
    fail(`app/competitor/CompetitorPageClient.tsx must not render raw error details via ${forbidden}`)
  }
}

if ((competitorSource.match(/console\.error/g) || []).length > 0) {
  fail('app/competitor/CompetitorPageClient.tsx has console-only error handling')
}

const simulatorSource = readSource(simulatorPath)
const simulatorErrorHelperSource = readSource(simulatorErrorHelperPath)
assertIncludes(simulatorSource, "import StatePanel from '@/components/StatePanel'", 'simulator common state panel')
assertIncludes(simulatorSource, "from '@/lib/foresightSimulatorProductSafeErrorViewModel'", 'simulator product-safe error helper import')
assertIncludes(simulatorSource, 'buildSimulatorErrorPanel', 'simulator product-safe error panel builder usage')
assertIncludes(simulatorSource, 'SIMULATOR_PRODUCT_SAFE_ERRORS', 'simulator bounded error constants usage')
assertIncludes(simulatorErrorHelperSource, 'export const SIMULATOR_PRODUCT_SAFE_ERRORS', 'simulator bounded error constants')
assertIncludes(simulatorErrorHelperSource, 'export function buildSimulatorErrorPanel', 'simulator product-safe error panel builder')
assertIncludes(simulatorSource, 'function toJsonOrThrow(response: Response)', 'simulator bounded response guard')
assertIncludes(simulatorSource, "throw new Error('request_failed')", 'simulator bounded response failure')
assertIncludes(simulatorSource, "fetch('/api/filters')", 'simulator filters fetch contract')
assertIncludes(simulatorSource, "fetch('/api/predict'", 'simulator prediction fetch contract')
assertIncludes(simulatorSource, "fetch('/api/predict-range'", 'simulator range fetch contract')
assertIncludes(simulatorSource, "fetch('/api/py-predict'", 'simulator ML fetch contract')
assertIncludes(simulatorSource, 'setFiltersError(true)', 'simulator filters error state')
assertIncludes(simulatorSource, 'setPredictionError(true)', 'simulator prediction error state')
assertIncludes(simulatorSource, 'setRangeError(true)', 'simulator range error state')
assertIncludes(simulatorSource, 'setScenarioError(true)', 'simulator scenario error state')
assertIncludes(simulatorSource, 'setMlError(SIMULATOR_PRODUCT_SAFE_ERRORS.mlBaseline.title)', 'simulator ML error state')
assertIncludes(simulatorErrorHelperSource, '필터 정보를 불러오지 못했습니다', 'simulator filters bounded Korean error copy')
assertIncludes(simulatorErrorHelperSource, '기본 예측을 불러오지 못했습니다', 'simulator prediction bounded Korean error copy')
assertIncludes(simulatorErrorHelperSource, '예산 구간을 불러오지 못했습니다', 'simulator range bounded Korean error copy')
assertIncludes(simulatorErrorHelperSource, '타겟 확장 시나리오를 불러오지 못했습니다', 'simulator scenario bounded Korean error copy')
assertIncludes(simulatorErrorHelperSource, '보조 기준선을 불러오지 못했습니다', 'simulator ML bounded Korean error copy')
assertIncludes(simulatorSource, 'variant="error"', 'simulator common error panel')
assertIncludes(simulatorSource, 'ledger={filtersErrorPanel.ledger}', 'simulator filters error ledger')
assertIncludes(simulatorSource, 'ledger={predictionErrorPanel.ledger}', 'simulator prediction error ledger')
assertIncludes(simulatorSource, 'ledger={rangeErrorPanel.ledger}', 'simulator range error ledger')
assertIncludes(simulatorSource, 'ledger={scenarioErrorPanel.ledger}', 'simulator scenario error ledger')
assertIncludes(simulatorSource, 'ledger={mlErrorPanel.ledger}', 'simulator ML error ledger')

for (const forbidden of forbiddenRawErrorSnippets) {
  if (simulatorSource.includes(forbidden)) {
    fail(`app/SimulatorPageClient.tsx must not render raw error details via ${forbidden}`)
  }
  if (simulatorErrorHelperSource.includes(forbidden)) {
    fail(`lib/foresightSimulatorProductSafeErrorViewModel.ts must not render raw error details via ${forbidden}`)
  }
}

if ((simulatorSource.match(/console\.error/g) || []).length > 0) {
  fail('app/SimulatorPageClient.tsx has console-only error handling')
}

const pyPredictSource = readSource(pyPredictRoutePath)
assertIncludes(pyPredictSource, "error: 'ML 서비스 오류'", 'py-predict bounded upstream error')
assertIncludes(pyPredictSource, "error: isTimeout ? 'ML 서비스 응답 시간 초과' : 'ML 서비스 연결 실패'", 'py-predict bounded connection error')
for (const forbidden of ['detail:', 'tip:', 'String(err', 'String(error', 'data.detail']) {
  if (pyPredictSource.includes(forbidden)) {
    fail(`app/api/py-predict/route.ts must not expose detailed ML service errors via ${forbidden}`)
  }
}

if (!process.exitCode) {
  console.log('[check-protected-error-states] ok')
}
