# Hiring fair CHECKPOINT

Personal Whale Normal Quarry Ridge run, Y2 M11: the hiring-fair choice hid the crew benefit behind "Has consequences". The displayed story variant did not mention it either.

| Gate | Result |
|---|---|
| Latest-main base | 7c9a30fc8fe90964426cfdb7fa405403fb83cdb2 |
| Narrow fix | Describe the existing hiringFairUntil flag as fewer labor shortages and read its duration from the effect |
| Stakes retained | Cash cost and town goodwill still come from the event's effects |
| Unit regression | 577 passed; real card, alternate duration and malformed fallback covered |
| Browser regression | 121 passed, including both full click journeys and the terse-story hiring-fair choice |
| Lint / TypeScript / build | Passed; existing bundle-size warning remains |
| Pixels | 1280x720 inspected: cost, goodwill and six-month benefit fit before choosing |
| Engine / bots / tuning | Unchanged; no seed grid required |
| Save schema | Unchanged; no migration required |
| Deployment | Verify Pages SHA and replay the pending actual-run event after merge |

Screenshot: `docs/screenshots/cold2/hiring-fair-benefit.png`.
