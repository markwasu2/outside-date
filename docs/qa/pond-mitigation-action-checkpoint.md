# Pond mitigation action CHECKPOINT

Personal Whale Hard replay at Y1 M11: touching the pond after its wetlands permit was granted said "Mitigate the pond below", but the popup offered no mitigation action. The action existed only on the blocked H1. The next cue found H1 correctly, but direct pond touch was a dead end.

The pond now offers the same mitigation action as the blocked hall, with the same cost, duration, blocked-hall name and legality checks. The hall route remains unchanged. A missing wetlands permit still disables the action with its reason; queueing mitigation replaces it with the existing work clock. No new engine action or rule.

| Gate | Result |
|---|---|
| Latest-main base | faeadbd1f9e95839dab912073d80642bc4e1481b |
| Scope | Add existing mitigation action to pond touch |
| Unit suite | 610 passed; identical hall/pond row, absent for underway/done/no blocked hall, pure |
| Browser suite | 139 passed across both full shards; pending permit disabled, granted enabled, click queues work and shows clock |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720 inspected; action, cost, four-month duration and blocked hall readable; Close and End month clear |
| Engine / bots / tuning | Unchanged; seed grids not applicable |
| Save schema | Unchanged; no migration required |
| Deployment | Verify Pages/live asset, then retry natural Y1 M11 pond touch |

Screenshot: `docs/screenshots/cold2/pond-mitigation-action.png`.
