# Phase 6 spike: does placement matter?

Branch `spike-spatial` off main 7f564318. One session. NOT for merge.

## The prototype

The smallest change that makes placement a real decision: **pad placement at groundbreak**.

- Each hall picks a pad when it breaks ground (`advanceHall` with `params.pad`).
- `tuning.spatial.nearPads` (2) pads sit adjacent to the substation and cost nothing.
- Every further hall takes the far pad: a one-time feeder trench (`farFeederCost`, $250K,
  funded through the construction waterfall) and monthly line losses once delivered
  (`farLineLossPerMonth`, $40K/mo, netted in the rent tick and the rent ticker).
- No choice requested = near while one is free, so bots, old saves (pad is optional on Hall,
  absent reads as 'near') and the perfect-play fixture all work unchanged.
- UI: unplaced halls carry an "unplaced" chip; the hall popover offers both pads with live
  prices and remaining near-pad count; placed halls carry a green "near pad" / amber "far pad"
  chip. Screenshots in the report (p6-*.png).

Tests: tests/engine/spatial.test.ts (capacity, explicit-near rejection on full pads, explicit
far, line losses in the rent tick, end-to-end through step()). 463 vitest, lint, tsc, build
green. Playwright: full 37-spec suite green, including playtest-fixes "fix 14" (the 300-second
real-click fast-forward soak), verified 4/4 repeat runs at ~1.5s matching main.

Fix-14 postmortem (resolved): the first spike cut of the pad chip was an absolutely positioned
div with zIndex 2 and default pointer events, so it sat above modal dialogs in hit-testing and
swallowed the event-choice click - the soak deadlocked with an event modal up (deterministic
4/4 stall on the branch vs 4/4 pass on main; engine fastForward/step were byte-identical, and
the wizard seeds campaigns with Math.random(), so a stall pattern that clean could only be
UI-side). Fix: pointerEvents: 'none' on the chip - it is a passive indicator, and the hall
cell underneath owns the click. Same class of bug as the Term/explainer pointer-events rule.

## What it proves

1. **The feel is real and cheap to reach.** One knob (scarce near pads) turns "watch it run"
   into "which two halls get the good pads" - the first decision on the board that is about
   WHERE, not WHEN or HOW MUCH. The whole thing is ~150 lines of engine + UI on top of the
   phase 1-5 board, because the board already renders per-hall cells and per-object popovers.
2. **Placement priced in dollars does not move outcomes at this game's scale.** 1000-seed
   grid on the spike vs main (Phase 5): greedy 66.7/50.6/50.6 vs 66.9/50.7/50.6; careful
   99.4/75.0/28.6 identical; competent 95.8/73.2/44.7 identical; multiples identical to 2dp.
   Two feeder trenches plus a few years of $40K/mo losses is under $2M on a $1.3B campus -
   below seed noise. A spatial game whose teeth are dollar costs is decoration.
3. **For placement to MATTER it must touch schedule or capacity, not money.** E.g. far pads
   add construction months (haul), only near-pad halls can energize per month (substation
   crew throughput), exclusion zones (pond/wetlands from phase 4) remove pads, crates in the
   laydown yard block pads until consumed. Every one of those moves delivery timing, and
   delivery timing is exactly what the 60-75% win band measures.

## What a full spatial rewrite would actually touch

- **Engine state**: Hall gains coordinates/footprint; GameState gains a site plan; collision
  and adjacency rules; save version v5 -> v6 with a migration that assigns positions to
  in-flight saves (or abandons them).
- **Systems**: construction.ts (haul time, pad staging), power.ts (energization queue,
  feeder runs), lease.ts (losses per distance), events.ts (storm/fire spread by adjacency),
  selectors.ts, projections.ts (every "months to delivery" forecast).
- **Bots**: every archetype's policy gains a placement planner; the perfect-play fixture and
  every hand-computed odds test that walks a hall through stages is re-pinned.
- **UI**: MapGrid stops being a fixed collage and becomes a real grid with drag/choose
  placement; hallAreaLayout, HallSprite, board/actions.ts, deltas.ts all reworked.
- **Tests**: balance.test.ts bands re-measured across 12 cells; sitegrid for millbrook;
  the tutorial's scripted beats re-taught around placement.

Estimate: 6-10 sessions for the rewrite plus 1-2 for the balance retune - matching the design
doc's fork.

## Balance-band risk

The measured risk is asymmetric. Cost-based placement (this spike): zero band movement,
proven above. Schedule/capacity-based placement (the only kind worth building): every lever
lands directly on median first-delivery month, the same variable the bands are built on.
Careful normal already sits at 75.0, the TOP of its 60-75% band, after phase 5 - any spatial
mechanic that slows groundbreak by even one month pushes the most-played archetype out of
band and forces a retune of campaign.maxMonths, stage months, or the bands themselves.

## Recommendation: conditional NO-GO on the full rewrite

Do not spend 6-10 sessions on the general spatial framework now. Instead, if more of the
Stardew feel is wanted, ship 2-3 small scarcity mechanics in this spike's shape (each is a
day or two, each provably band-safe by a 1000-seed grid before merge):

1. This pad mechanic, re-toothed: far pad adds 1-2 pad-stage months (schedule, not dollars).
   Expected band impact: measurable but small; verify with a grid before merging.
2. Laydown yard capacity: N crate slots; a spot-bought unit you cannot stage blocks the next
   order. Ties phase 5's markets into placement.
3. Pond/wetlands exclusion on farmland (phase 4 site): one fewer hall position there, which
   is a scenario-design lever, not a system.

Revisit the full rewrite only if these three land and players still read the board as
"watching, not placing."
