# Foresight-Handoff-6 Production 404 Routing Triage Plan

Date: 2026-05-09
Repo: admate-foresight
Gate: Foresight-Handoff-6
Status: plan only
Basis: Handoff-5 production-safe smoke failure

## Result Being Gated

Handoff-5 stayed inside the committed production-safe boundaries, but production returned `404` for the expected Foresight surfaces:

- `/login`
- `/auth/handoff`
- protected pages including `/`, `/trends`, `/insights`, `/competitor`, and `/account`

This means deployed behavior did not demonstrate the recent Foresight routes. The observed `404` responses were fail-closed for protected content exposure, but they did not prove that the new login, handoff callback, or protected-route behavior is active in production.

This gate is a read-only triage plan. Do not redeploy, mutate production state, authenticate, or run another production smoke while writing or validating this plan.

## Possible Causes To Separate

Treat these as separate hypotheses until read-only evidence narrows them:

| Cause | Question To Answer | Safe Evidence Shape |
| --- | --- | --- |
| Deployment not updated | Is production serving a revision before the recent Foresight route work? | deployed commit hash or deployment metadata, if available without secret output |
| Wrong production domain or project | Is `foresight.admate.ai.kr` attached to the expected Vercel project and repo? | project/domain metadata, sanitized host/project names only |
| Route base path or framework config mismatch | Is the app deployed under a base path, output mode, or route config that differs from local expectations? | local `next.config`, `vercel.json`, route inventory, and build manifest summaries |
| Vercel or build output issue | Did the deployed build omit expected app routes or emit a different output shape? | read-only build/deployment metadata or local `.next` manifest summaries |
| Middleware/proxy mismatch | Is middleware/proxy intercepting or excluding routes differently in production? | local middleware/proxy file inventory and manifest summaries |
| Custom domain pointing elsewhere | Does the custom domain resolve to a different deployment, project, or hosting target? | DNS/domain metadata summaries without credentials or secret records |

## Safe Read-Only Checks

Allowed checks for the next operator:

- Confirm git/local HEAD and branch state using read-only git commands.
- Confirm local `origin/main` ancestry for the expected handoff commits.
- Inspect Vercel deployment metadata only if the connector or CLI is already allowed and does not require entering, printing, or exposing secrets.
- Request production `HEAD` or a version route only if that route is already public, non-authenticated, and known not to emit secrets.
- Build a local route inventory from source files without calling production application flows.
- Inspect local build route manifests after a local build, reporting only route names and sanitized metadata.
- Inspect `next.config.ts`, `vercel.json`, middleware/proxy files, and route manifests for base path, output, rewrites, redirects, middleware matchers, and route inclusion.
- Perform a no-session browser smoke only if the browser profile has no cookies, no product session, no saved credentials, and no authenticated Core state.

Allowed evidence:

- command names and sanitized summaries
- commit hashes
- route paths
- status codes
- sanitized deployment, project, or domain identifiers when already visible through authorized read-only tooling
- header names and non-sensitive header summaries

Do not print or store response bodies unless they are already public, non-sensitive, and necessary to identify a static 404 shell.

## Explicitly Forbidden

Do not perform any of the following in this gate:

- SQL
- DB mutation
- Auth mutation
- product credential use
- valid handoff code use
- authenticated Core start
- login handling
- password handling
- session handling
- Meta API call
- Python retrain
- benchmark import
- benchmark upload
- env output
- secret output

Do not request, paste, log, screenshot, or store credentials, cookies, tokens, sessions, raw handoff codes, raw provider payloads, raw environment values, or sensitive query values.

## Stop Points For User Or Operator Intervention

Stop and ask the user/operator to decide before continuing if any of these occurs:

- Vercel connector or CLI returns scope, project, team, or deployment `403`.
- Domain DNS, custom-domain ownership, or project ownership is ambiguous.
- Any check requires new environment, deployment, Vercel, DNS, or secret access.
- Any useful next step would require a production redeploy or promotion.
- A valid handoff code, product credential, cookie-bearing browser profile, or authenticated Core start would be needed.
- Evidence would require printing env values, secrets, cookie values, session values, tokens, or raw handoff codes.

Record only a sanitized blocker summary at the stop point.

## Read-Only Triage Order

1. Local repo identity:
   - confirm working directory
   - confirm current branch and HEAD
   - confirm whether expected commits are included in local `HEAD` and `origin/main`

2. Local route/config inventory:
   - list expected source routes for `/login`, `/auth/handoff`, `/`, `/trends`, `/insights`, `/competitor`, and `/account`
   - inspect `next.config.ts` and `vercel.json`
   - inspect middleware/proxy presence and matchers

3. Local build and manifest inspection:
   - run the normal local build validation
   - inspect `.next` route manifests for expected routes
   - report route presence/absence only, without env or secret output

4. Deployment/domain metadata, if already allowed:
   - identify the production deployment revision
   - identify the Vercel project receiving `foresight.admate.ai.kr`
   - compare deployed revision and local expected revision
   - stop on `403`, ambiguity, or access request

5. Public production route check, only if still safe:
   - use no cookies and no credentials
   - prefer `HEAD` where useful
   - call only already-public version or route endpoints
   - stop if authentication, session, valid code, or credential handling appears

## Pass Criteria

This plan passes when it clearly defines:

- Handoff-5's production `404` outcome and why it did not prove recent routes
- separate possible causes for the `404` behavior
- read-only checks that can narrow deployment, domain, route, build, and middleware/proxy causes
- forbidden actions that protect DB/Auth, credentials, sessions, Meta, Python retrain, benchmark import/upload, env, and secrets
- stop points requiring user/operator intervention
- the next gate as read-only deployment/domain verification

## Fail Criteria

This plan fails if it allows or implies:

- a production redeploy without explicit approval
- credentialed production access
- valid handoff flow execution
- SQL, DB/Auth mutation, Meta API, Python retrain, benchmark import, or benchmark upload
- env or secret disclosure
- cookie, token, session, password, product credential, or raw handoff code handling

## Validation

Required validation for this documentation-only gate:

```text
git diff --check -- docs/tasks/2026-05-09_foresight_handoff_6_production_404_routing_triage_plan_v1.md
targeted secret-like scan
npx tsc --noEmit
npm run build
npm run benchmark:dry-run
staged files none
```

The targeted secret-like scan should cover this file and report only whether suspicious values were found. It must not print env files, secrets, cookies, sessions, tokens, credentials, raw handoff codes, or provider payloads.

## Next Gate Suggestion

Foresight-Handoff-7 read-only deployment/domain verification.
