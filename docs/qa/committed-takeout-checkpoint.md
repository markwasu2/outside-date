# Commit takeout before closeout CHECKPOINT

Personal live Quarry route: after pricing, the report appeared immediately. Reload resumed at the takeout window instead of the ending. Root cause: top-level routing used draft.phase, so the price preview entered the terminal screen and removed End month before the planned takeout could commit and autosave.

Terminal routing now uses committed state.phase. Pricing stays on campus with End month available. Its contextual cue says to commit the takeout; the ordinary plan/remove review still works. End month then uses the existing takeout commit/autosave path. No engine or save-schema change.

| Gate | Result |
|---|---|
| Latest-main base | 9c41d180b5119d5a1c00e5de006b74bf4e30c899 |
| Unit suite | 613 passed |
| Browser suite | 142 passed, both full shards; new real-click preview/commit/reload test; both full personal-style journey tests now explicitly commit their takeout |
| Lint / TypeScript / build | Passed; existing bundle warning remains |
| Pixels | 1280x720 inspected; End month remains visible during pricing preview |
| Engine / bots / tuning | Unchanged; grids not applicable |
| Save schema | Unchanged; no migration required |
| Deployment | Verify Pages; price, commit and reload the saved natural Quarry takeout |

The full suites passed before the final cue-only wording refinement; targeted closeout browser tests and lint/TypeScript/build passed again after it.
