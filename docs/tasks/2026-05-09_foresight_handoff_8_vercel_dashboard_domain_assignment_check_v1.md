# Foresight-Handoff-8 Vercel Dashboard Domain Assignment Check

Date: 2026-05-09
Repo: admate-foresight
Gate: Foresight-Handoff-8
Status: operator dashboard check required
Scope: Vercel Dashboard metadata review only

## Scope Guard

This handoff is for a human operator using the Vercel Dashboard or an otherwise working authorized metadata context. Do not perform code changes, redeploys, deployment promotions, SQL/DB/Auth mutations, environment value readouts, token/cookie/session handling, or secret output as part of this check.

The production host under review is `https://foresight.admate.ai.kr`.

## Current Blocker From Handoff-7

The public production host `https://foresight.admate.ai.kr` returns a uniform Vercel edge `404` for `/`, `/login?next=/`, `/auth/handoff`, `/trends`, `/insights`, `/competitor`, and `/account`.

Local evidence does not explain the `404`:

- The source tree contains the expected app routes.
- A local production build passed and included the expected paths in the Next.js route table and manifests.
- Local manifests showed no `basePath`, no custom rewrites, no dynamic-route-only behavior, and no middleware/proxy matcher that would account for every route missing.
- DNS reaches Vercel infrastructure, so the issue is not simply a non-Vercel DNS target.

The most likely unresolved cause is a Vercel custom domain/project/deployment association issue, or the production host pointing at the wrong/empty Vercel project. A stale production deployment remains possible because the deployed commit could not be verified.

Metadata verification was blocked in this environment:

- Vercel connector teams were empty, so no project id was available through the connector.
- Vercel CLI metadata commands were blocked by `self-signed certificate in certificate chain`.
- No local `.vercel/project.json` exists, so local project/team ids are unavailable.

## Vercel Dashboard Checklist

Use the Vercel Dashboard only unless a separate approved metadata path is available. Record observations without exposing secrets, tokens, cookies, or environment values.

1. Identify the Vercel project that currently owns `foresight.admate.ai.kr`.
   - Open the dashboard domain search or project domain settings.
   - Search for `foresight.admate.ai.kr`.
   - Record the owning team/account and project name only.

2. Confirm the owning project is the expected Foresight project.
   - Expected repository: `Jhongjin/admate-foresight`.
   - Expected project: the Foresight production project for `admate-foresight`.
   - If the domain belongs to another project, stop before changing anything and classify as domain reassignment needed.

3. Confirm custom domain verification and production assignment.
   - Domain should be verified/valid in Vercel.
   - Domain should be assigned to the expected project production environment.
   - Confirm it is not only attached to preview, an archived project, an old migration project, or another unrelated app.

4. Confirm the latest production deployment commit.
   - Preferred: production deployment git commit includes `785f48c`.
   - Minimum acceptable ancestry for the known route fixes/plans: production includes both `262c51f` and `d9d9678`.
   - Record only commit short hash, branch, deployment age/time, and deployment state. Do not copy logs containing secrets.

5. Inspect project settings that could cause a root mismatch.
   - Framework preset should match the app, expected to be Next.js.
   - Root directory should point at the repository root unless the project intentionally uses a subdirectory.
   - Build command should be consistent with the repo's normal Next.js build.
   - Output/install settings should not point to another package, static folder, or empty app.
   - Environment values may be checked for presence/status only if needed; do not reveal names with sensitive values or any values.

6. Decide the next action with explicit operator approval.
   - If the domain is attached to the wrong project: prepare a domain reassignment action, but do not execute it in this gate unless separately approved.
   - If the domain is attached to the right project but production is stale: prepare a controlled redeploy or production promotion gate, but do not execute it in this gate unless separately approved.
   - If the domain, project, deployment commit, and settings all look correct: classify as unresolved Vercel routing/deployment issue and escalate to a deeper authorized metadata/support check.

## Stop Conditions

Stop immediately and do not mutate anything if any of the following occurs:

- The dashboard shows `foresight.admate.ai.kr` belongs to a project other than the expected Foresight project.
- The project owner/team is unclear.
- The domain is unverified, misassigned, assigned only to preview, or associated with an archived/legacy project.
- The latest production deployment does not include `785f48c` and does not at least include both `262c51f` and `d9d9678`.
- Project root/framework/build settings appear to target the wrong app or directory.
- Any step would require revealing env values, secrets, tokens, cookies, session data, or private credentials.
- Any fix would require redeploy, promotion, domain reassignment, DB/Auth mutation, or code change without explicit approval.

## Result Template

Fill this in after the dashboard review. Keep it sanitized.

```text
Dashboard reviewer:
Review time:

Domain:
- Host: foresight.admate.ai.kr
- Domain status:
- Owning team/account:
- Owning Vercel project:
- Assigned environment:

Expected project match:
- Repo shown in Vercel:
- Matches Jhongjin/admate-foresight: yes/no/unclear
- Notes:

Production deployment:
- Deployment state:
- Branch:
- Commit short hash:
- Includes 785f48c: yes/no/unclear
- Includes 262c51f and d9d9678 at minimum: yes/no/unclear

Project settings:
- Framework preset:
- Root directory:
- Build command:
- Output/install settings:
- Suspicious setting found: yes/no/unclear

Classification:
- Domain reassignment needed: yes/no/unclear
- Controlled redeploy/promotion needed: yes/no/unclear
- Escalate deeper Vercel metadata/support check: yes/no/unclear

Approved next action:
- None/domain reassignment/redeploy/promotion/escalation:
- Approval source:
- Notes:
```

## Validation

To be completed after writing this handoff:

| Command/check | Result |
| --- | --- |
| `git diff --check -- docs/tasks/2026-05-09_foresight_handoff_8_vercel_dashboard_domain_assignment_check_v1.md` | pass |
| targeted secret-like scan of this report | pass, `0` suspicious matches |
