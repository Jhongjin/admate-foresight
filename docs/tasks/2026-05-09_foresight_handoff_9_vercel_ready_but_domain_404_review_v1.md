# Foresight Handoff 9: Vercel Ready but Domain 404 Review

Date: 2026-05-09

## Scope

This document records the current deployment/domain state for `admate-foresight` and the next dashboard checks to perform. No code, config, deployment, Vercel project setting, SQL, database, Auth, environment variable, or secret changes were made as part of this handoff.

## Confirmed Facts

- The user confirmed the Vercel project `admate-foresight` is connected to `Jhongjin/admate-foresight`.
- The latest production deployment for commit `eee4e39` is `Ready` and `Current`.
- The previous build error caused by the `vercel.json` functions pattern was fixed by commit `eee4e39`, which deleted `vercel.json`.
- The Vercel domains screen shows both `foresight.admate.ai.kr` and `admateplanner.vercel.app` as `Valid Configuration` / `Production`.
- Despite the ready/current production deployment and valid production domain configuration, the public custom/default domains still return a Vercel edge `404`.
- GitHub deployment status for commit `eee4e39` reports `environment_url` as:
  - `https://admate-foresight-86excqtoi-jeonhongjins-projects.vercel.app`
- That deployment URL returns `401`, indicating the deployment artifact exists but may be protected.

## Current Classification

The build blocker appears resolved. The likely remaining issue is not a source/build failure, but one of:

- The production alias/domain is not actually attached to the current `eee4e39` deployment.
- Deployment protection is preventing public access to the deployment artifact.
- Alias propagation or Vercel project domain configuration has not fully applied.
- The production domain selection exists in the domains screen but has not been saved/applied to the latest production deployment aliases.

## Next Dashboard Checklist

1. Open the latest `eee4e39` deployment details in Vercel.
2. Check the deployment's `Domains` / `Aliases` list.
3. Confirm both aliases are present on the current deployment:
   - `foresight.admate.ai.kr`
   - `admateplanner.vercel.app`
4. Check Vercel `Deployment Protection` settings for the project and deployment.
5. In `Project Settings > Domains`, confirm the production selection is saved/applied for both domains.
6. Optionally click `Refresh` on each domain from the Vercel domains screen.
7. Inspect deployment aliases again after refresh/save to confirm they point to the current `eee4e39` production deployment.

## Stop Conditions

Stop dashboard changes and report back if any of these are observed:

- `eee4e39` is no longer the `Current` production deployment.
- The latest deployment is not `Ready`.
- Either domain is missing from the current deployment's aliases list.
- Either domain is assigned to a different project or deployment.
- Deployment Protection is enabled and there is uncertainty about whether it should be disabled for public traffic.
- Vercel shows a warning, conflict, or pending state for either `foresight.admate.ai.kr` or `admateplanner.vercel.app`.
- Public domains continue returning Vercel edge `404` after aliases are confirmed on the current deployment and protection settings are verified.

## What To Report Back

Please report:

- Whether `eee4e39` is still `Ready` and `Current`.
- Whether `foresight.admate.ai.kr` appears in the deployment details aliases list.
- Whether `admateplanner.vercel.app` appears in the deployment details aliases list.
- Whether Deployment Protection is enabled for the project or deployment.
- Whether clicking `Refresh` changed either domain's status or alias attachment.
- The exact browser result for:
  - `https://foresight.admate.ai.kr`
  - `https://admateplanner.vercel.app`
  - `https://admate-foresight-86excqtoi-jeonhongjins-projects.vercel.app`

