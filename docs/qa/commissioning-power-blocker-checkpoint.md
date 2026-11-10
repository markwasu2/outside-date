# Commissioning power blocker CHECKPOINT

Personally played Millbrook Hard to a loss after intentionally delaying discovery and docket preparation. The substation was energized, but H1 needed 25 MW with only 20 MW available and plants due after its outside date. The map correctly pointed to plant capacity while the disabled commissioning action sent the player back to completed substation study/equipment work. The action now names the actual power-chain step: unfinished substation, automatic hookup with enough capacity, plant capacity/docket wait, or a final supply gap. Remaining hall prerequisite wording uses commissioning.

| Gate | Result |
|---|---|
| Latest-main base | d2d84c7a4d98634d1444324666541c284bffffc1 |
| Narrow fix | Read-only commissioning blocker direction; engine validation unchanged |
| Unit suite | 599 passed; four new cases cover prerequisites, plant shortage, next-tick hookup, final capacity gap and state purity |
| Browser suite | 133 passed across two full shards; map disabled action and optional Actions unavailable view agree |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720 inspected; full power explanation readable in hall popup with no clipping |
| Engine / bots / tuning | Unchanged; no seed grid required |
| Save schema | Unchanged; no migration required |
| Personal route | 0/1 delivered, loss Y3 M12; intentional early neglect delayed plants beyond outside date |
| Deployment | Verify Pages and live asset after merge |

Screenshot: `docs/screenshots/cold2/commissioning-power-blocker.png`.
