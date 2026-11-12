# Current map timeline

Coming up now uses resolution-aware milestones instead of the historical ledger. Already opened or ended halls, completed power studies, finished permits, arrived equipment and online plants no longer occupy future slots. Pending milestones keep their original dates and order. No engine timing or rules change.

## Verification

- Reproduced on production during a real six-hall run: H2 was open and showing rent while Coming up still listed H2 opening.
- All 754 unit, 255 browser and 27 built-app checks pass, plus lint/build.
- The new desktop fixture verifies completed work is absent while a pending water permit and unfinished H2 keep their dates.
- The real six-hall replay checks every rent-earning hall is absent from opening rows each month and continues through sale.
- Inspected actual built six-hall pixels and the mixed completed/pending fixture. Remaining H4/H5/H6 dates are visible without stale H1/H2/H3 rows.
- Screenshots in `../screenshots/current-map-timeline/`. Same layout, controls, game costs and timing.
