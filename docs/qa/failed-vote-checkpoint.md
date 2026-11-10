# Failed vote CHECKPOINT

Personal Whale Hard run, Y2 M2: the first docket vote failed. Neither appeal nor redesign stated its cost, delay, odds bonus or meeting consequences.

| Gate | Result |
|---|---|
| Latest-main base | a4bb24fc44b2a8db65277dc802efb8c00865ba1b |
| Narrow fix | Synthetic vote card reads resolved docket tuning for each alternative |
| Appeal | No cash cost, delay and odds bonus, settled meetings preserved |
| Redesign | Cash cost, delay, odds bonus, all intervenors reopen with one fewer meeting required |
| Shared warning | A second failed vote kills the docket; neither option guarantees approval |
| Unit regression | 579 passed; changed tuning and unknown-choice fallback covered |
| Browser regression | 123 passed, including both full click journeys and failed-vote choice regression |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720 inspected; both alternatives and warning fit before choosing |
| Engine / bots / tuning | Unchanged; no seed grid required |
| Save schema | Unchanged; no migration required |
| Deployment | Verify Pages and actual pending personal vote decision after merge |

Screenshot: `docs/screenshots/cold2/failed-vote-stakes.png`.
