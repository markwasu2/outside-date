# Testimony consecutive-month warning CHECKPOINT

Personal Whale Hard replay, Y1 M4: after preparing in Y1 M3, the action warned "Preparing again this month". The engine charges the goodwill cost when the previous preparation was last month, not for a same-month repeat. That wording could make the first action of the current month sound safe.

The warning now says: "You prepared last month, so preparing in consecutive months also costs commission goodwill -1."

| Gate | Result |
|---|---|
| Latest-main base | aa21a3ae398995d8f371fd42ebbc7e00b8e7c951 |
| Scope | One UI sentence, unit timeline coverage, existing browser assertion |
| Engine verification | regulation.ts prepTestimony tests lastPrepTestimonyMonth === state.month - 1 |
| Unit suite | 609 passed |
| Browser suite | 138 passed, full two shards with two workers |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720: full warning visible and contained, sticky Close and End month accessible |
| Engine / bot / tuning | Unchanged; seed grids not applicable |
| Save schema | Unchanged; no migration needed |
| Deployment | Verify Pages and live asset after guarded squash merge |

Screenshot: `docs/screenshots/cold2/testimony-consecutive-month.png`.
