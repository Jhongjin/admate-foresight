# Foresight-Handoff-4 Callback Session Production-Safe Smoke Plan

Date: 2026-05-09
Repo: admate-foresight
Gate: Foresight-Handoff-4
Status: plan only
Target: after commit `d9d9678`

## Scope

This task defines a production-safe smoke plan for the Foresight handoff callback and product-local session behavior after commit `d9d9678`.

This is a planning gate only. Do not call production while writing or validating this plan.

## Target Commit Inclusion Check Plan

Before any future smoke execution, confirm the deployed target includes commit `d9d9678` or a descendant commit.

Allowed confirmation methods:

- deployment metadata that reports the Git commit hash
- CI/CD release metadata that reports the deployed revision
- read-only build banner or version endpoint if it already exists and does not require authentication

Evidence to capture:

- reported commit hash or release revision
- whether `d9d9678` is included
- source of the confirmation

Do not use this check as permission to call authenticated production flows.

## Allowed Smoke Only

The future execution gate may only perform these no-credential, no-session checks:

- `/login` renders without an existing product session.
- `/auth/handoff` with missing `code` fails closed and redirects safely.
- `/auth/handoff` with an obviously invalid placeholder `code` fails closed and redirects safely.
- no-store and no-referrer header checks, if feasible without authentication or sensitive output.
- protected pages still redirect to login when there is no product session.

Allowed protected no-session routes:

- `/`
- `/trends`
- `/insights`
- `/competitor`
- `/account`

Required constraints:

- no product credential
- no valid handoff code
- no existing product session
- no Core authenticated browser start

## Explicitly Forbidden

Do not perform any of the following in this gate or its production-safe smoke execution:

- valid handoff flow
- Core authenticated start
- product credential use
- handoff row creation
- handoff row consume
- SQL execution
- DB mutation
- Auth mutation
- Meta API call
- Python retrain
- benchmark import
- benchmark upload
- token output
- cookie output
- session output
- raw handoff code output
- sensitive query value output

Do not request, paste, log, screenshot, or store credentials, cookies, tokens, sessions, raw handoff codes, raw provider payloads, or sensitive query values.

## Smoke Matrix

### `/login` No Session

Goal:

- Confirm the public login shell renders without a product session.

Allowed evidence:

- status
- sanitized page outcome summary
- header summaries only

Pass:

- page returns a non-error response or an expected redirect-free login render
- no token, cookie, session, credential, or raw code appears in captured evidence

Fail:

- server error
- sensitive value appears in output
- page attempts authenticated Core start automatically

### `/auth/handoff` Missing Code

Goal:

- Confirm a missing code fails closed and redirects safely.

Allowed evidence:

- status
- sanitized `Location` host and path only
- statement that no sensitive query values were captured
- header summaries only

Pass:

- response is a fail-closed redirect or safe fail-closed response
- redirect target host is expected or same-origin
- redirect target path is safe
- no sensitive query values are reported

Fail:

- successful session establishment
- redirect to an external or unexpected host
- sensitive query values appear in evidence

### `/auth/handoff` Invalid Placeholder Code

Goal:

- Confirm an invalid non-secret placeholder code fails closed and redirects safely.

Allowed placeholder:

- a clearly fake value such as `invalid-smoke-code`

Allowed evidence:

- status
- sanitized `Location` host and path only
- statement that no sensitive query values were captured
- header summaries only

Pass:

- response is a fail-closed redirect or safe fail-closed response
- no product session is created
- no sensitive query values are reported

Fail:

- callback accepts the placeholder as valid
- product session appears to be created
- evidence includes token, cookie, session, credential, or raw code data

### Header Checks

Goal:

- Check response cache and referrer protections where feasible without authentication.

Candidate headers:

- `cache-control`
- `pragma`
- `expires`
- `referrer-policy`

Allowed evidence:

- header name and sanitized summary only
- no cookie values
- no full `set-cookie` output

Pass:

- sensitive callback responses are not cacheable
- referrer policy does not expose sensitive URLs
- no sensitive header values are printed

Fail:

- callback response is publicly cacheable
- referrer policy can leak query values
- evidence includes raw cookie, token, session, credential, or code values

### Protected Pages No Session

Goal:

- Confirm protected Foresight pages remain fail-closed without a product session.

Allowed evidence:

- status
- sanitized `Location` host and path only
- no sensitive query values
- header summaries only

Pass:

- each protected route redirects to login or otherwise fails closed
- redirect path is safe
- no protected page content is available without session

Fail:

- protected content renders without session
- redirect target is external or unexpected
- sensitive query values are captured

## Evidence Template

For each smoke check, capture only:

- check name
- status
- sanitized `Location` host, if present
- sanitized `Location` path, if present
- confirmation that no sensitive query values were captured
- header summaries only
- pass/fail result
- stop condition triggered, if any

Do not include:

- token values
- cookie values
- session values
- raw handoff codes
- product credentials
- full sensitive URLs
- raw query strings

## Stop Conditions

Stop immediately if any of the following occurs:

- a valid handoff code is required
- a product credential is requested
- Core authenticated start is needed
- a DB/Auth mutation would be required
- SQL execution is suggested
- a handoff row would be created or consumed
- a token, cookie, session, credential, raw code, or sensitive query value appears in output
- protected content renders without a session
- callback succeeds with a missing or placeholder invalid code
- redirect host is external or unexpected
- Meta API, Python retrain, benchmark import, or benchmark upload becomes involved

When a stop condition triggers, record only a sanitized summary and do not continue additional production checks.

## Pass Conditions

This plan is ready for the next gate when:

- deployed target inclusion check method for `d9d9678` is identified
- every allowed smoke has a no-session, no-credential execution shape
- evidence fields exclude sensitive values by design
- forbidden actions are explicit
- stop conditions are explicit

Future production-safe smoke execution passes only if:

- `d9d9678` or a descendant is confirmed as deployed
- `/login` renders safely without session
- missing and invalid `/auth/handoff` checks fail closed
- protected pages remain inaccessible without session
- feasible header checks show no unsafe caching or referrer behavior
- no forbidden action occurs
- no sensitive value is captured

## Fail Conditions

The smoke execution gate fails if:

- target commit inclusion cannot be confirmed
- any allowed smoke requires credentials or a valid handoff code
- callback succeeds without a valid authorized flow
- protected content is available without session
- redirect target is unsafe
- evidence contains sensitive values
- any explicit forbidden action is performed or becomes necessary

## Recommended Next Gate

Foresight-Handoff-5 production-safe smoke execution.
