import fs from 'node:fs'
import path from 'node:path'

import { runBenchmarkDryRunMockCases } from '../lib/benchmark/dryRunHarness.mts'

const root = process.cwd()

const files = {
  packageJson: path.join(root, 'package.json'),
  dryRunScript: path.join(root, 'scripts', 'benchmark-dry-run.mjs'),
  dryRunHarness: path.join(root, 'lib', 'benchmark', 'dryRunHarness.mts'),
  sourceMetadataTest: path.join(root, 'tests', 'benchmark', 'benchmark-source-metadata-contract.test.ts'),
  routeOutputGuardTest: path.join(root, 'tests', 'benchmark', 'benchmark-route-output-guards.test.ts'),
}

const localOnlyFiles = {
  'benchmark dry-run script': files.dryRunScript,
  'benchmark dry-run harness': files.dryRunHarness,
}

const forbiddenBoundaryPatterns = [
  { label: 'createClient', pattern: /\bcreateClient\b/ },
  { label: '@supabase', pattern: /@supabase/i },
  { label: 'fetch(', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { label: '/api/', pattern: /\/api\// },
  { label: 'process.env', pattern: /\bprocess\.env\b/ },
  { label: 'fs.write', pattern: /\bfs\.write\w*\b/ },
  { label: 'writeFile', pattern: /\bwriteFile(?:Sync)?\b/ },
  { label: 'appendFile', pattern: /\bappendFile(?:Sync)?\b/ },
  { label: 'exec', pattern: /\bexec(?:File|Sync)?\b/ },
  { label: 'spawn', pattern: /\bspawn(?:Sync)?\b/ },
  { label: 'meta-ads route', pattern: /meta-ads/i },
  { label: 'google-ads route', pattern: /google-ads/i },
  { label: 'py-predict route', pattern: /py-predict/i },
  { label: 'py-retrain route', pattern: /py-retrain/i },
  { label: 'provider route', pattern: /provider[-_/](?:route|call|sync)/i },
]

const requiredDryRunScriptSnippets = [
  "harness: 'AdMate Foresight Benchmark Dry-run Harness v1'",
  "mode: 'local_inline_mock_only'",
  'side_effects: {',
  'db_write: false',
  'meta_api_call: false',
  'llm_call: false',
  'python_retrain: false',
  'raw_file_created: false',
  'summary: result.summary',
  'expectation_failures: result.expectation_failures',
  'reports: result.reports',
]

const forbiddenDryRunPayloadSnippets = [
  'buildBenchmarkDryRunMockCases',
  'baseRows(',
  'sheets:',
  'rows:',
  'SourceRow',
  'test_input.json',
]

const requiredHarnessSnippets = [
  'source_column_masked_or_label',
  'normalized_preview_sample',
  'privacy_findings',
  'llm_boundary_status',
  'raw_identifier_in_output_risk',
  'safe_aggregate_only',
  'blocked_security_review',
  'safe_only_if_aggregate',
  "'[identifier_column]'",
  "'[security_sensitive_column]'",
  "normalized_preview_sample.length === 0",
]

const requiredTestSnippets = {
  'benchmark source metadata contract': {
    file: files.sourceMetadataTest,
    snippets: [
      'not.toContain(invalidSourceType)',
      'METADATA_ACCEPTED_SOURCE_COLUMNS',
      'not.toContain(\'acct_raw_should_not_echo\')',
      'not.toContain(\'campaign_raw_should_not_echo\')',
      'not.toContain(\'https://example.invalid/raw-export\')',
    ],
  },
  'benchmark route output guard contract': {
    file: files.routeOutputGuardTest,
    snippets: [
      'FORBIDDEN_RENDERED_OUTPUTS',
      '/acct_mock/i',
      '/campaign_mock/i',
      '/adset_mock/i',
      '/ad_mock/i',
      '/advertiser_mock/i',
      '/credential_marker/i',
      'reportReady).toBe(false)',
      'promotionReady).toBe(false)',
      'unsafeFindings).toEqual([])',
    ],
  },
}

const forbiddenRenderedOutputPatterns = [
  /acct_mock/i,
  /campaign_mock/i,
  /adset_mock/i,
  /ad_mock/i,
  /advertiser_mock/i,
  /credential_marker/i,
  /access[_-]?token/i,
  /sessionid/i,
  /cookie=/i,
  /https?:\/\/example\.invalid\/export/i,
  /"rows"\s*:/i,
  /"sheets"\s*:/i,
]

function fail(message) {
  console.error(`[check-benchmark-source-static-contract] ${message}`)
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

function assertDoesNotMatch(source, pattern, label, context) {
  if (pattern.test(source)) fail(`${context} must not include ${label}`)
}

const packageSource = readSource(files.packageJson)
assertIncludes(
  packageSource,
  '"check:benchmark-source-static-contract": "node --experimental-strip-types scripts/check-benchmark-source-static-contract.mjs"',
  'package script contract',
)

for (const [context, filePath] of Object.entries(localOnlyFiles)) {
  const source = readSource(filePath)
  for (const { label, pattern } of forbiddenBoundaryPatterns) {
    assertDoesNotMatch(source, pattern, label, `${context} side-effect boundary`)
  }
}

const dryRunScriptSource = readSource(files.dryRunScript)
for (const expected of requiredDryRunScriptSnippets) {
  assertIncludes(dryRunScriptSource, expected, 'benchmark dry-run output contract')
}
for (const forbidden of forbiddenDryRunPayloadSnippets) {
  assertDoesNotInclude(dryRunScriptSource, forbidden, 'benchmark dry-run payload boundary')
}

const harnessSource = readSource(files.dryRunHarness)
for (const expected of requiredHarnessSnippets) {
  assertIncludes(harnessSource, expected, 'benchmark source privacy contract')
}

for (const { file, snippets } of Object.values(requiredTestSnippets)) {
  const source = readSource(file)
  for (const expected of snippets) {
    assertIncludes(source, expected, `${path.basename(file)} coverage contract`)
  }
}

const result = runBenchmarkDryRunMockCases()
const payload = {
  harness: 'AdMate Foresight Benchmark Dry-run Harness v1',
  mode: 'local_inline_mock_only',
  side_effects: {
    db_write: false,
    meta_api_call: false,
    llm_call: false,
    python_retrain: false,
    raw_file_created: false,
  },
  summary: result.summary,
  expectation_failures: result.expectation_failures,
  reports: result.reports,
}
const serializedPayload = JSON.stringify(payload)

for (const [key, value] of Object.entries(payload.side_effects)) {
  if (value !== false) fail(`side_effects.${key} must remain false`)
}

if (result.expectation_failures.length > 0) {
  fail(`dry-run mock expectations failed: ${result.expectation_failures.join('; ')}`)
}

for (const pattern of forbiddenRenderedOutputPatterns) {
  if (pattern.test(serializedPayload)) {
    fail(`dry-run payload must not expose ${pattern}`)
  }
}

if (!process.exitCode) {
  console.log('[check-benchmark-source-static-contract] ok')
}
