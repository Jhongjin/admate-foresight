import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const file = (...parts) => path.join(root, ...parts)
const rel = (target) => path.relative(root, target).replaceAll(path.sep, '/')

const targetRoutes = [
  file('app', 'api', 'predict', 'route.ts'),
  file('app', 'api', 'predict-range', 'route.ts'),
  file('app', 'api', 'filters', 'route.ts'),
  file('app', 'api', 'trends', 'route.ts'),
  file('app', 'api', 'breakdown', 'route.ts'),
  file('app', 'api', 'insights', 'route.ts'),
  file('app', 'api', 'seasonality', 'route.ts'),
  file('app', 'api', 'regression-summary', 'route.ts'),
  file('app', 'api', 'py-predict', 'route.ts'),
  file('app', 'api', 'meta-ads', 'route.ts'),
  file('app', 'api', 'google-ads', 'route.ts'),
  file('app', 'api', 'meta-ads-scrape', 'route.ts'),
]

const externalLookupRoutes = [
  file('app', 'api', 'meta-ads', 'route.ts'),
  file('app', 'api', 'google-ads', 'route.ts'),
  file('app', 'api', 'meta-ads-scrape', 'route.ts'),
]

const diagnosticLogRoutes = [
  file('app', 'api', 'filters', 'route.ts'),
  file('app', 'api', 'predict-range', 'route.ts'),
]

const sharedHelpers = {
  authGuard: file('lib', 'auth', 'foresightApiGuard.ts'),
  mlBaselineProxyContract: file('lib', 'foresightSimulatorMlBaselineProxyContract.ts'),
  security: file('lib', 'security.ts'),
  rateLimit: file('lib', 'rateLimit.ts'),
}

const forbiddenRawErrorSnippets = [
  'err.message',
  'error.message',
  'String(err',
  'String(error',
  'JSON.stringify(err',
  'JSON.stringify(error',
  'statusText',
  '.stack',
  'response.text()',
  'res.text()',
  'data.detail',
  'detail:',
]

const forbiddenExternalLookupSnippets = [
  'status: res.status',
  'HTTP ${res.status}',
  'data.error?.message',
  'response.statusText',
  'response.text()',
  'return blocked;',
  'return requireInternalKey(req)',
]

let failed = false

function fail(message) {
  console.error(`[check-api-response-safety-static] ${message}`)
  failed = true
}

function read(target) {
  if (!fs.existsSync(target)) {
    fail(`missing ${rel(target)}`)
    return ''
  }

  return fs.readFileSync(target, 'utf8')
}

function assertIncludes(source, expected, context) {
  if (!source.includes(expected)) fail(`${context} missing ${expected}`)
}

function stripQuotedText(line) {
  return line
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '``')
}

function sourceWithoutLocalNoStoreHelper(source) {
  return source.replace(
    /function\s+jsonNoStore\s*\([^)]*\)\s*:\s*NextResponse\s*\{\s*[\s\S]*?headers\.set\('Cache-Control', 'no-store'\);\s*return NextResponse\.json\(body, \{ \.\.\.init, headers \}\);\s*\}\s*/g,
    '',
  )
}

function assertRouteNoStore(source, target) {
  const relative = rel(target)
  const hasLocalHelper =
    source.includes('function jsonNoStore') &&
    source.includes("headers.set('Cache-Control', 'no-store')") &&
    source.includes('return NextResponse.json(body, { ...init, headers })')
  const hasSharedHelper = source.includes('noStoreJson(')

  if (!hasLocalHelper && !hasSharedHelper) {
    fail(`${relative} must use a no-store JSON response helper`)
  }

  const routeBody = sourceWithoutLocalNoStoreHelper(source)
  if (routeBody.includes('NextResponse.json(')) {
    fail(`${relative} must not return NextResponse.json directly outside jsonNoStore`)
  }

  if (routeBody.includes('return jsonNoStore(') || routeBody.includes('return noStoreJson(')) {
    return
  }

  fail(`${relative} has no protected route JSON response through no-store helper`)
}

function assertBoundedErrors(source, target) {
  const relative = rel(target)

  for (const forbidden of forbiddenRawErrorSnippets) {
    if (source.includes(forbidden)) {
      fail(`${relative} must not expose raw error details via ${forbidden}`)
    }
  }

  const errorResponsePattern =
    /(jsonNoStore|noStoreJson|NextResponse\.json)\s*\(\s*\{\s*error\s*:\s*(err|error|apiErr|scrapeErr)\b/s
  if (errorResponsePattern.test(source)) {
    fail(`${relative} must not put raw error objects in JSON error envelopes`)
  }

  const consoleLines = source
    .split(/\r?\n/)
    .filter((line) => line.includes('console.error'))

  for (const line of consoleLines) {
    const unquoted = stripQuotedText(line)
    const args = unquoted.replace(/^.*console\.error\(/, '')
    const namesRawError =
      /\b(err|error|apiErr|scrapeErr)\b/.test(args) &&
      !line.includes('sanitizeError(')
    const logsObjectLiteral = /,\s*\{/.test(args)

    if (namesRawError || logsObjectLiteral) {
      fail(`${relative} must log sanitized or bounded error details: ${line.trim()}`)
    }
  }
}

function consoleDiagnosticLines(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => /console\.(log|warn|error)\s*\(/.test(line))
}

function assertBoundedDiagnosticLogging(source, target) {
  const relative = rel(target)

  for (const forbidden of [
    ".join(', ')",
    '.join(", ")',
    '첫 reach',
    'first reach',
    'firstReach',
    'results[0]?.reach',
    'results[0].reach',
  ]) {
    if (source.includes(forbidden)) {
      fail(`${relative} must not log diagnostic detail via ${forbidden}`)
    }
  }

  for (const line of consoleDiagnosticLines(source)) {
    const unquoted = stripQuotedText(line)
    const args = unquoted.replace(/^.*console\.(log|warn|error)\s*\(/, '')
    if (/,\s*\{/.test(args)) {
      fail(`${relative} must not log unbounded diagnostic objects: ${line.trim()}`)
    }
  }

  if (relative === 'app/api/filters/route.ts') {
    for (const collectionName of ['csvIndustries', 'xlsxIndustries', 'allIndustries']) {
      for (const line of consoleDiagnosticLines(source)) {
        const unquoted = stripQuotedText(line)
        if (unquoted.includes(collectionName) && !unquoted.includes(`${collectionName}.length`)) {
          fail(`${relative} must log only bounded industry counters/booleans: ${line.trim()}`)
        }
      }
    }
  }

  if (relative === 'app/api/predict-range/route.ts') {
    for (const line of consoleDiagnosticLines(source)) {
      const unquoted = stripQuotedText(line)
      if (/\b(reach|cpm|cpc|dataSufficiency)\b/.test(unquoted)) {
        fail(`${relative} must not log prediction output values: ${line.trim()}`)
      }
    }
  }
}

function assertExternalLookupFailClosed(source, target) {
  const relative = rel(target)

  for (const forbidden of forbiddenExternalLookupSnippets) {
    if (source.includes(forbidden)) {
      fail(`${relative} must not use external lookup provider detail passthrough via ${forbidden}`)
    }
  }

  if (!source.includes('External ads lookup failed.')) {
    fail(`${relative} must use bounded external lookup failure copy`)
  }

  if (!source.includes('noStoreJson(')) {
    fail(`${relative} must keep external lookup responses no-store`)
  }

  if (/status\s*:\s*(res|response)\.status/.test(source)) {
    fail(`${relative} must not propagate provider status directly`)
  }
}

function assertPredictRouteResultContract(source) {
  const relative = 'app/api/predict/route.ts'

  assertIncludes(
    source,
    'normalizePredictResult',
    'predict route aggregate-only result contract',
  )

  if (!/const\s+normalizedResult\s*=\s*normalizePredictResult\s*\(\s*result\s*\)/.test(source)) {
    fail(`${relative} must normalize predictor output before responding`)
  }

  if (!/return\s+jsonNoStore\s*\(\s*normalizedResult\s*\)/.test(source)) {
    fail(`${relative} must return only normalized prediction output`)
  }

  for (const pattern of [
    /return\s+jsonNoStore\s*\(\s*result\s*[,)]/,
    /return\s+noStoreJson\s*\(\s*result\s*[,)]/,
    /return\s+NextResponse\.json\s*\(\s*result\s*[,)]/,
  ]) {
    if (pattern.test(source)) {
      fail(`${relative} must not return raw predictor result`)
    }
  }
}

function assertPredictRangeRouteResultContract(source) {
  const relative = 'app/api/predict-range/route.ts'

  assertIncludes(
    source,
    'normalizeForecastRangeResponse',
    'predict-range route aggregate-only result contract',
  )

  if (!/const\s+normalizedResponse\s*=\s*normalizeForecastRangeResponse\s*\(\s*\{\s*range\s*:\s*results,\s*confirmation,\s*\}\s*\)/s.test(source)) {
    fail(`${relative} must normalize range and confirmation before responding`)
  }

  if (!/if\s*\(\s*!normalizedResponse\.rangeData\s*\|\|\s*!normalizedResponse\.confirmation\s*\)/.test(source)) {
    fail(`${relative} must fail closed when normalized response is malformed`)
  }

  if (!/console\.error\s*\(\s*'\[predict-range\] invalid range response'\s*\)/.test(source)) {
    fail(`${relative} must log only bounded invalid response detail`)
  }

  if (!/return\s+jsonNoStore\s*\(\s*\{\s*range\s*:\s*normalizedResponse\.rangeData,\s*confirmation\s*:\s*normalizedResponse\.confirmation,\s*\}\s*\)/s.test(source)) {
    fail(`${relative} must return only normalized range response output`)
  }

  for (const pattern of [
    /return\s+jsonNoStore\s*\(\s*\{\s*range\s*:\s*results,\s*confirmation\s*\}\s*\)/,
    /return\s+noStoreJson\s*\(\s*\{\s*range\s*:\s*results,\s*confirmation\s*\}\s*\)/,
    /return\s+NextResponse\.json\s*\(\s*\{\s*range\s*:\s*results,\s*confirmation\s*\}\s*\)/,
  ]) {
    if (pattern.test(source)) {
      fail(`${relative} must not return raw predict-range results`)
    }
  }
}

for (const route of targetRoutes) {
  const source = read(route)
  assertRouteNoStore(source, route)
  assertBoundedErrors(source, route)
}

for (const route of externalLookupRoutes) {
  assertExternalLookupFailClosed(read(route), route)
}

for (const route of diagnosticLogRoutes) {
  assertBoundedDiagnosticLogging(read(route), route)
}

assertPredictRouteResultContract(read(file('app', 'api', 'predict', 'route.ts')))
assertPredictRangeRouteResultContract(read(file('app', 'api', 'predict-range', 'route.ts')))

const metaAdsSource = read(file('app', 'api', 'meta-ads', 'route.ts'))
assertIncludes(metaAdsSource, 'function safeMetaSnapshotUrl', 'meta-ads snapshot URL allowlist')
assertIncludes(metaAdsSource, 'ad_snapshot_url: safeMetaSnapshotUrl', 'meta-ads snapshot URL allowlist')
assertIncludes(metaAdsSource, '^\\d{1,32}$', 'meta-ads snapshot id guard')

const metaScrapeSource = read(file('app', 'api', 'meta-ads-scrape', 'route.ts'))
assertIncludes(metaScrapeSource, 'function safeMetaExternalUrl', 'meta scrape media URL allowlist')
assertIncludes(metaScrapeSource, 'function safeMetaSnapshotUrl', 'meta scrape snapshot URL allowlist')
assertIncludes(metaScrapeSource, 'snapshot_url:  safeMetaSnapshotUrl', 'meta scrape API snapshot URL allowlist')
assertIncludes(metaScrapeSource, 'image_url: safeMetaExternalUrl(imageUrl)', 'meta scrape image URL allowlist')
assertIncludes(metaScrapeSource, 'profile_image: safeMetaExternalUrl(profileImage)', 'meta scrape profile URL allowlist')

const pyPredictSource = read(file('app', 'api', 'py-predict', 'route.ts'))
assertIncludes(
  pyPredictSource,
  'normalizeForesightSimulatorMlBaselineProxySuccessResponse',
  'py-predict ML baseline proxy success allowlist',
)
assertIncludes(
  pyPredictSource,
  'normalizeForesightSimulatorMlBaselineProxyRequest',
  'py-predict ML baseline proxy request allowlist',
)
assertIncludes(
  pyPredictSource,
  'FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_REQUEST_ERROR',
  'py-predict bounded invalid ML baseline request error',
)
assertIncludes(
  pyPredictSource,
  'FORESIGHT_SIMULATOR_ML_BASELINE_PROXY_INVALID_ERROR',
  'py-predict bounded invalid ML baseline error',
)
if (/return\s+jsonNoStore\s*\(\s*data\s*\)/.test(pyPredictSource)) {
  fail('app/api/py-predict/route.ts must not return raw Python success data')
}
if (/JSON\.stringify\s*\(\s*body\s*\)/.test(pyPredictSource)) {
  fail('app/api/py-predict/route.ts must not forward the parsed request body to Python')
}

const mlBaselineProxyContractSource = read(sharedHelpers.mlBaselineProxyContract)
for (const marker of [
  'ForesightSimulatorMlBaselineProxyRequestValidationError',
  'normalizeForesightSimulatorMlBaselineProxyRequest',
  'allowlistForesightSimulatorMlBaselineProxySuccessResponse',
  'normalizeForesightSimulatorMlBaselineProxySuccessResponse',
  'ML baseline prediction request is invalid.',
  'ML service returned an invalid prediction.',
  "'예산'",
  "'기간'",
  "'random_forest'",
  "'linear_regression'",
]) {
  assertIncludes(
    mlBaselineProxyContractSource,
    marker,
    'ML baseline proxy aggregate-only contract',
  )
}

const authGuardSource = read(sharedHelpers.authGuard)
if (!authGuardSource.includes("'Cache-Control': 'no-store'")) {
  fail(`${rel(sharedHelpers.authGuard)} must return no-store auth failures`)
}

const securitySource = read(sharedHelpers.security)
for (const marker of [
  'export function noStoreJson',
  "headers.set('Cache-Control', 'no-store')",
  'return noStoreJson(',
  'requireInternalKey',
  'blockProductionDebugRoute',
]) {
  if (!securitySource.includes(marker)) {
    fail(`${rel(sharedHelpers.security)} missing ${marker}`)
  }
}

const rateLimitSource = read(sharedHelpers.rateLimit)
for (const marker of [
  "import { noStoreJson } from './security'",
  'return noStoreJson(',
  "'Retry-After'",
]) {
  if (!rateLimitSource.includes(marker)) {
    fail(`${rel(sharedHelpers.rateLimit)} missing ${marker}`)
  }
}

if (failed) {
  process.exitCode = 1
} else {
  console.log('[check-api-response-safety-static] ok')
}
