# Takeout window change: 1000-seed validation in progress

Same seeds 1-1000, all four bots, easy/normal/hard, Whale and Millbrook Relay.
Before grids were captured on main before changing conversion. No bot changes.

Rule: seasoned conversion waits while any unfinished nonterminated hall is still
inside its outside date, capped by the existing maxMonths. Conversion/interest
rules and campaign cutoff stay unchanged. No state shape change.

Untuned change: Whale normal careful 77.8%, competent 74.0%; hard competent 52.8%.
Normal exceeded the 75% ceiling, hard exceeded the existing 45% regression ceiling.

Final candidate: Whale normal base exit cap 7.75% (was 7.25%), hard 8.25% (was
7.25%). Easy and Millbrook unchanged. Normal 70.4% careful / 70.2% competent;
hard 31.7% competent. Full raw candidates and before/after CSVs are adjacent.
Millbrook results are identical before/after.

Final gates: 518 unit, 62 e2e, lint, typecheck and build pass after final hard
retune. Updated expansion cutoff card inspected at 1280x720. No regression bands
were widened. Save migration skipped because there is no state shape change.
