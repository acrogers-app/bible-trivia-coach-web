# Stripe Unlock Checklist — Bible Study Coach (web)

Run this after ANY change to checkout, verification, or Pro gating.
Root-cause history: 2026-07-31 — /play's Pro card was a static placeholder
that never read entitlement (`useIsPro`), so paid users kept seeing
"Unlock Pro — $2.99" even with `btc-pro=1` set. Entitlement = localStorage
`btc-pro` + cookie `btc-pro` (10-yr) — either one unlocks; both are set only
after `/api/checkout/verify` confirms the Stripe session is `paid`.

- [ ] Unlock persists after browser refresh
- [ ] Unlock persists after navigating away and back
- [ ] /play shows unlocked without needing a refresh (same-tab event)
- [ ] Success page verifies session_id with Stripe before showing "Pro unlocked!"
- [ ] Success page with missing/invalid session_id shows the failure state
- [ ] localStorage AND cookie both set on verified unlock
- [ ] /play, /pricing, and the landing pricing section all show the unlocked state
- [ ] Test: pay → redirect → "Start studying" → /play shows unlocked
- [ ] New tab on /play still shows unlocked
- [ ] Clearing localStorage only (keep cookies) still shows unlocked
