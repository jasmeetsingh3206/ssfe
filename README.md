# Remittance Review

Vue 3 + TypeScript + Vite + Vitest. UI uses Tailwind and PrimeVue 4. The API is an in-memory Express mock in `mock-api/`.

## Setup

Needs Node 24 (`.nvmrc`).

```sh
nvm use
npm install
cd mock-api && npm install
```

## Run

Two terminals:

```sh
cd mock-api && npm run dev   # mock API on :3001
npm run dev                  # app on http://localhost:5173
```

The app opens `/batches/B-104`. Also try `/batches/B-090` (posted, read-only) and `/batches/B-500` (500 lines).
The app calls `/api/...`, and Vite forwards it to the mock. Restart the mock to reset its data.

## Tests

```sh
npm run test:unit -- --run
npm run type-check
npm run lint
```

## Mock switches

```sh
curl -X POST localhost:3001/__mock -H 'content-type: application/json' -d '{"delay": 800}'
curl -X POST localhost:3001/__mock -H 'content-type: application/json' -d '{"delay": "random"}'   # 100–1500 ms
curl -X POST localhost:3001/__mock -H 'content-type: application/json' -d '{"failNext": true}'    # next request fails (500)
curl -X POST localhost:3001/__mock -H 'content-type: application/json' -d '{"delay": 0, "failNext": false}'
```

To see a 409 conflict, open B-104 in two tabs, split L-6 in one, then choose Suspense on L-6 in the other.

## Assumptions

- `formatCents` uses a plain hyphen: `-$200.00`.
- Auto-match uses `originalCode` instead of `code` when it is present.
- An invalid line can only be excluded; it can't go back to Unmatched.
- Readiness reasons: "Batch is already posted", "N lines unmatched", "Totals differ by $X".
- The header works out readiness from the lines with the same rule as the server's `canPost`.
- Match on a Matched line shows its allocation. To change it, unmatch first. Unmatch asks for confirmation.
- The reason a line is invalid is shown in a tooltip.
- Mock: no lab isolation (R7) or full error order (R9). `limit` is capped to 1–50. Simulated failures use error code `internal`. B-104 has extra remarks, one with HTML.
- The mock is a separate project with its own copy of the split rule, because the real backend is .NET.
- PrimeVue is pinned to 4.5.5 (MIT). Version 5 needs a paid license.

## Not done

- No page-level or browser tests.
- Other users' changes only show after a reload or a 409.
