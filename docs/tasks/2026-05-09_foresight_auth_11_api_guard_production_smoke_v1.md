# Foresight Auth-11 API Guard Production Smoke

Date: 2026-05-09

## Scope

This smoke verifies the production deployment after the Foresight product-local API
guard patch.

Implementation commit:

- `8678339 fix: guard Foresight API routes`

Production target:

- `https://foresight.admate.ai.kr`

## Result

Status: PASS

The normal UI/data API surface now fails closed for no-session requests. The
internal-key, disabled, and debug-deny surfaces kept their existing behavior.

## No-session API guard checks

All requests were sent without a Foresight session cookie, product credential,
Core session, or handoff code.

| Request | Expected | Observed | Result |
| --- | ---: | ---: | --- |
| `GET /api/filters` | 401 | 401 | PASS |
| `GET /api/trends` | 401 | 401 | PASS |
| `GET /api/breakdown` | 401 | 401 | PASS |
| `GET /api/insights` | 401 | 401 | PASS |
| `GET /api/seasonality` | 401 | 401 | PASS |
| `GET /api/regression-summary` | 401 | 401 | PASS |
| `GET /api/google-ads` | 401 | 401 | PASS |
| `GET /api/meta-ads` | 401 | 401 | PASS |
| `GET /api/meta-ads-scrape` | 401 | 401 | PASS |
| `POST /api/predict` | 401 | 401 | PASS |
| `POST /api/predict-range` | 401 | 401 | PASS |
| `POST /api/py-predict` | 401 | 401 | PASS |

## Unchanged surface checks

These routes were intentionally left outside the product-local session guard in
this gate.

| Request | Expected | Observed | Result |
| --- | ---: | ---: | --- |
| `GET /api/debug-env` | 404 | 404 | PASS |
| `GET /api/debug-data` | 404 | 404 | PASS |
| `POST /api/export` | 403 | 403 | PASS |
| `POST /api/meta-sync` | 503 | 503 | PASS |
| `POST /api/py-retrain` | 503 | 503 | PASS |

## Boundaries

The smoke did not perform:

- Login
- Positive Core-to-Foresight handoff
- Handoff code generation or redemption
- Product credential use
- SQL execution
- DB/Auth data mutation
- Meta API execution
- Python retrain execution
- Benchmark import/upload
- Secret, token, cookie, session, code, code hash, or raw provider output capture

## Notes

The positive browser handoff flow still requires runtime env/credential readiness
and an approved authenticated session. That flow can create and consume a real
handoff row, so it remains a separate human-approved gate.
