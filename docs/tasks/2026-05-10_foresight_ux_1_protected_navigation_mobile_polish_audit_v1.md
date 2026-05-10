# Foresight-UX-1 Protected Navigation Mobile Polish Audit v1

Date: 2026-05-10
Status: reviewed
Scope: Foresight protected navigation and mobile polish

## Verdict

Decision: PASS_WITH_P2_POLISH_FOLLOWUP

The current Foresight navigation is acceptable for the completed auth/handoff
MVP and does not block the rollout. A mobile navigation polish follow-up is
recommended before broader product UX QA.

## Current Navigation Shape

Current component:

```text
components/Navigation.tsx
```

Current behavior:

- brand block on the left
- four primary product links
- logout button hidden on `/login` and `/reset-password`
- logout button shown on protected surfaces
- horizontal overflow container used for narrow screens
- protected page content constrained by the root layout max-width container

## What Is Good Enough

The current implementation is good enough for auth closure because:

- logout is discoverable on desktop protected surfaces
- logout does not appear on login/reset-password surfaces
- no protected data, cookie value, session value, token, handoff code, or
  credential is displayed in navigation
- mobile login page does not show logout
- mobile navigation can scroll horizontally rather than forcing page-wide
  overflow

## P2 Polish Findings

### 1. Mobile navigation is scrollable, not purpose-built

Current narrow-screen behavior uses horizontal overflow for the product links.
That prevents layout breakage, but it is not as polished as a compact menu or
segmented mobile nav.

Recommended follow-up:

- keep desktop nav unchanged
- add a compact mobile nav affordance for product links
- keep logout reachable without forcing wide horizontal scroll
- avoid adding marketing copy or instructional text

### 2. Brand plus nav can consume vertical space on small screens

The nav wraps on small screens. This is acceptable, but it can consume more
vertical space than desired on dense product pages.

Recommended follow-up:

- keep brand visible
- reduce small-screen nav height
- use stable button dimensions to avoid layout shift

### 3. Logout state is functional but visually minimal

`로그아웃 중` gives basic feedback. That is acceptable for MVP. A later polish
could use a small loading state while keeping the button width stable.

Recommended follow-up:

- reserve stable width for logout button states
- do not expose session state or account identifiers

## No-Touch Boundaries

Do not change as part of this UX follow-up:

- Core handoff route
- Foresight callback/redeem logic
- session cookie format
- benchmark import/upload
- Meta API
- Python retrain
- DB schema
- env values

## Verification Plan For A Future Patch

Required:

- `npx tsc --noEmit`
- `npm run build`
- `npm run benchmark:dry-run`
- targeted eslint for changed UI files
- desktop 1440px smoke
- mobile 390px smoke
- no-session `/login` smoke
- authenticated logout smoke if operator session is needed

Expected:

- no page-wide horizontal overflow
- active nav state remains clear
- logout hidden on login/reset
- logout visible on protected surfaces
- protected routes still fail closed after logout

## Next Gate

`Foresight-UX-2 mobile navigation polish implementation`

This can be implemented later. It is not a blocker for the auth/handoff MVP
closure.
