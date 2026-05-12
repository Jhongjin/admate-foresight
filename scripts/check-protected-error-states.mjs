import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const statePanelPath = path.join(root, 'components', 'StatePanel.tsx')
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

if (!process.exitCode) {
  console.log('[check-protected-error-states] ok')
}
