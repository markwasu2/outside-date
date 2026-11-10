# Live hall event targets CHECKPOINT

Personal Hard cash-stress replay delivered H2/H3 and lost H1 at its outside date. An inspection later targeted the already-terminated H1 because stage history remained active. Construction event eligibility and stage-based effect selection both treated that history as live work.

| Gate | Result |
|---|---|
| Latest-main base | 9928ac1daac8bc72ef630d3b6ad1025ffe73a97e |
| Narrow fix | Construction-stage eligibility and effect selection exclude delivered/terminated halls |
| Shared stage semantics | Both event gates and effect selectors use the same live-hall check |
| RNG | No new RNG consumers or streams; only invalid event candidates removed |
| Unit regression | 589 passed, including terminal-only eligibility and mixed live/terminal selection over 30 RNG seeds |
| Browser regression | 126 passed, including a forced inspection against retained terminal stage history and both full journeys |
| Before/after grids | 1000 seeds, all four bots and all difficulties, Whale and Millbrook Relay |
| Grid result | Whale greedy normal 39.0% to 39.1%; other 23 rows unchanged |
| Required Whale normal band | Careful 73.4%, competent 69.7%, both remain within 60-75% |
| Lint / TypeScript / build | Passed; existing bundle-size warning remains |
| Pixels | 1280x720 inspected; terminal halls stay terminal and no inspection notice is generated |
| Save schema | Unchanged; no migration. Existing historical inspection flags are not erased |
| Deployment | Verify Pages and resume actual Hard save after merge |

Screenshot: `docs/screenshots/cold2/terminal-hall-events.png`. Full grids are stored alongside this checkpoint.
