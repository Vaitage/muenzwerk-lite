# Münzwerk Lite – notes for AI coding assistants

Budget book for the phone, the small sibling of Münzwerk (github.com/Vaitage/Muenzwerk). No server, no bank
connection, no push messages: expenses and extra income are typed in, recurring items (income, fixed costs,
savings) are kept as a list, the daily budget is a "pot". Data lives only on the device (IndexedDB).

## Tech
- Plain HTML/CSS/JS without a build step in `web/`, served as static files (GitHub Pages).
- `web/calc.js` – all calculations (also used by node tests). `L.month(state, "YYYY-MM", "YYYY-MM-DD")`.
- `web/store.js` – one record in IndexedDB (fallback localStorage). Backup/restore as JSON file (`app: "muenzwerk-lite"`).
- `web/app.js` – UI (overview, entries, statistics, settings, sheets). `APP_VERSION` here.
- `web/sw.js` – offline cache. **Bump `CACHE` together with `APP_VERSION`** on every release.
- `web/i18n.js` – texts via `t("German text")` / `tn(n, one, many)`; add the English version (test checks).
- `web/icons.js` – stroke icons and logo, copied from Münzwerk.

## Rules of the calculation
- Daily amount (pot) = (income − fixed costs − savings) ÷ days in month; income = recurring income + entered income.
- Available on day d = daily amount × d − everything spent this month (can be negative).
- "Spread" mode: left until month end ÷ remaining days (incl. today).
- Fixed items may have an optional `category_id` (income/expense, not savings); fixed expenses with a category
  also count under "by category" in the statistics.
- Large expenses (≥ `settings.large_cents`, default €250) count fully but are not extrapolated in the forecast.

## Workflow
- Tests: `node --test tests/*.test.mjs`. Local: `python -m http.server 8765 --directory web`.
- README images: `python tools/screenshots.py de|en` (made-up data, fixed date 17 Nov 2026).
- Push to `main` → GitHub Action runs tests and deploys `web/` to Pages (https://vaitage.github.io/muenzwerk-lite/).
- Code comments mostly German; commit messages English. Demo/test data stays made up – never real account data.
- Mobile basics (1.1.1): `touch-action: manipulation` on html (no double-tap zoom, pinch stays), no text selection on
  controls, `:active` feedback, `overscroll-behavior: none`. Double-tap guard in `app.js`: same button twice within
  400 ms and clicks into a sheet within 400 ms after it opened are dropped (keypad excluded); `lockSave(sheet)`.
- Touch targets ≥ 44 px, text contrast ≥ 4.5:1 (tokens in `styles.css` are checked values from Münzwerk).
