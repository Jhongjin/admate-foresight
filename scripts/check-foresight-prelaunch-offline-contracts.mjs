import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const packageJsonPath = path.join(root, 'package.json')
const aggregateScriptName = 'check:foresight-prelaunch-offline-contracts'
const localVerifyScriptName = 'verify:prelaunch-local'
const aggregateScriptCommand = 'node scripts/check-foresight-prelaunch-offline-contracts.mjs'

const approvedOfflineContractScripts = [
  'check:api-response-safety-static',
  'check:auth-handoff-static',
  'check:benchmark-kpi-static-contract',
  'check:benchmark-source-static-contract',
  'check:sentinel-prediction-evidence-manifest',
  'check:prediction-request-contract',
]

const excludedLiveOrMutatingCapabilities = [
  'provider calls',
  'SQL/storage mutation',
  'env/secret work',
  'live ingest',
  'authenticated UI smoke',
  'upload',
  'publish',
  'persist',
  'promote',
  'apply',
  'campaign mutation',
]

const forbiddenSelectedScriptPatterns = [
  /\bprovider\b/i,
  /\bsql\b/i,
  /\bstorage\b/i,
  /\benv\b/i,
  /\bsecret\b/i,
  /\blive\b/i,
  /\bingest\b/i,
  /\bauthenticated\b/i,
  /\bui[-:]?smoke\b/i,
  /\bupload\b/i,
  /\bpublish\b/i,
  /\bpersist\b/i,
  /\bpromote\b/i,
  /\bapply\b/i,
  /\bcampaign\b/i,
  /\bmutation\b/i,
]

const forbiddenSelectedCommandPatterns = [
  /\bvercel\b/i,
  /\bnext\s+(dev|start)\b/i,
  /\bplaywright\b/i,
  /\bcypress\b/i,
  /\bpython\b/i,
  /\bsupabase\b/i,
  /\bfirebase\b/i,
  /\bprisma\b/i,
  /\bdrizzle\b/i,
  /\bseed\b/i,
  /\bmigrate\b/i,
  /\bingest\b/i,
  /\bupload\b/i,
  /\bpublish\b/i,
  /\bpersist\b/i,
  /\bpromote\b/i,
  /\bapply\b/i,
  /\bcampaign\b/i,
  /\bprocess\.env\b/i,
  /\bdotenv\b/i,
  /\b[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD)\b/,
]

let failed = false

function fail(message) {
  console.error(`[foresight-prelaunch-offline-contracts] ${message}`)
  failed = true
}

function readPackageJson() {
  if (!fs.existsSync(packageJsonPath)) {
    fail('missing package.json')
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  } catch (error) {
    fail(`package.json is not valid JSON: ${error.message}`)
    return null
  }
}

function validatePackageWiring(packageJson) {
  const scripts = packageJson?.scripts ?? {}

  if (scripts[aggregateScriptName] !== aggregateScriptCommand) {
    fail(
      `${aggregateScriptName} must be wired to "${aggregateScriptCommand}"`,
    )
  }

  if (scripts[localVerifyScriptName] !== `npm run ${aggregateScriptName}`) {
    fail(
      `${localVerifyScriptName} must run "npm run ${aggregateScriptName}"`,
    )
  }

  for (const scriptName of approvedOfflineContractScripts) {
    if (!scripts[scriptName]) {
      fail(`missing approved offline contract script: ${scriptName}`)
    }
  }

  return scripts
}

function validateOfflineBoundary(scripts) {
  for (const scriptName of approvedOfflineContractScripts) {
    if (!/^[a-z0-9:-]+$/.test(scriptName)) {
      fail(`approved script name has unexpected characters: ${scriptName}`)
    }

    const command = scripts[scriptName] ?? ''
    const matchedNamePattern = forbiddenSelectedScriptPatterns.find((pattern) =>
      pattern.test(scriptName),
    )
    const matchedCommandPattern = forbiddenSelectedCommandPatterns.find((pattern) =>
      pattern.test(command),
    )

    if (matchedNamePattern) {
      fail(
        `${scriptName} is outside the offline prelaunch subset (${matchedNamePattern})`,
      )
    }

    if (matchedCommandPattern) {
      fail(
        `${scriptName} command is outside the offline prelaunch subset: "${command}"`,
      )
    }
  }
}

function runScript(scriptName, index, total) {
  console.log('')
  console.log(
    `[foresight-prelaunch-offline-contracts] ${index}/${total} npm run ${scriptName}`,
  )

  const isWindows = process.platform === 'win32'
  const result = spawnSync(
    isWindows ? `npm run ${scriptName}` : 'npm',
    isWindows ? [] : ['run', scriptName],
    {
      cwd: root,
      stdio: 'inherit',
      shell: isWindows,
    },
  )

  if (result.error) {
    console.error(
      `[foresight-prelaunch-offline-contracts] failed to start ${scriptName}: ${result.error.message}`,
    )
    process.exit(1)
  }

  if (result.status !== 0) {
    console.error(
      `[foresight-prelaunch-offline-contracts] ${scriptName} failed with status ${result.status}`,
    )
    process.exit(result.status ?? 1)
  }
}

const packageJson = readPackageJson()
const scripts = validatePackageWiring(packageJson)
validateOfflineBoundary(scripts)

console.log('[foresight-prelaunch-offline-contracts] offline/static boundary')
console.log(
  `[foresight-prelaunch-offline-contracts] included: ${approvedOfflineContractScripts.join(', ')}`,
)
console.log(
  `[foresight-prelaunch-offline-contracts] excluded: ${excludedLiveOrMutatingCapabilities.join('; ')}`,
)

if (failed) {
  process.exit(1)
}

approvedOfflineContractScripts.forEach((scriptName, index) => {
  runScript(scriptName, index + 1, approvedOfflineContractScripts.length)
})

console.log('')
console.log('[foresight-prelaunch-offline-contracts] all offline contracts passed')
