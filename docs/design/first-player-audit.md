# Fresh-player screen audit

Review of the shipped desktop game before the tycoon-view change, using the visible screens rather than the advice card or engine debug controls.

- Title: a new player cannot tell whether "Quick start", "New game" or "Tutorial" is the normal way to begin, and the paragraph names several business roles before explaining the game.
- Setup: ten choices about racks, cooling, leases, forecasts, debt and insurance demand knowledge the player has not earned yet.
- First month: cash and focus are visible, but the goal is buried in an optional panel and nothing on the map looks like a familiar Build button.
- Object panel: the player must translate "commission interconnection", "option site", "draw freeze" and "advance construction" into the actions needed to build.
- Waiting month: "End month" looks like ending a turn, but the interface does not show an obvious timeline connecting that click to permits, crews and deliveries.
- Event: several text panels can compete for attention, so the reason work stopped is less clear than the fact that an alert exists.
- Finished campus: the player sees lender tests and seasoning before seeing a familiar Sell button, and cannot tell what ends the game.
- Report: grades and risk allocation arrive before a simple summary of buildings opened, sale proceeds and profit.

## New default

One-screen goal, ready-made first campus, cash and action points, build controls on the map, upcoming milestones, Next month, compact consequences and Sell campus. Keep the full financing and setup interface as an optional Detailed view, not the first thing a player must learn. Engine rules and costs are unchanged. The new first-campus scenario allows 30 months and a month-23 opening target, drops the two forced tutorial disruptions, and starts with local road/school work funded. Ordinary random events and inspections remain. A separate fresh-storage journey must exercise this default; the existing detailed-mode regression suite is not proof that the new view works.

## November 10: first-campus small wins

- The default campus now tracks eight actual milestones: land, foundation, permits, power, frame, walls, interiors, opening. Buying land moves progress immediately; starting construction does not falsely mark it finished.
- First-campus building permit review is one month at 98% base odds. Frame, shell and fit-out have two-month minimums. Only this starter scenario changes; other scenario balance stays unchanged.
- Standard versus express equipment is a real cash/timing choice. Quotes include standard total, deposit, balance and market-adjusted lead; disabled choices retain their effect text.
- Contacts appear after land purchase. Visits explicitly change relationships rather than construction speed. Extra crews become available once relevant.
- Verification: 665 unit tests; 156 browser tests (39+39+38 completed in shard 3, its one interrupted fast-forward test rerun passed, then 39 in shard 4); built-app ground decode check. Two complete fresh desktop journeys and a separate first-three-month choice journey passed. Inspected actual 1280x720 early-game pixels and both desktop scene fixtures.

## November 10 evening: second material pass
- Recessed blue-gray roof membrane with parapet shadows, equipment plinth shadows and solar modules.
- Warm masonry/glass entrance pavilion, canopy columns, side conduit, fire escape and distinct cladding materials.
- Fit-out now reveals connected campus service roads and a planted courtyard with walks, benches and shrubs. These are scenery in the hall build, not new power or income.
- Night shading applies to the added landscape as well as buildings.
- Seven relevant browser regressions passed including both desktop full journeys and six-hall art. Built image decode, build and lint passed; inspected actual day and night images at 1280x720.

## November 10 evening: frozen monthly receipts and cold-player fixes
- Always-visible results after each finished month: actual bank change, separate construction spend, completed milestones and the most important development. It is frozen while today's choices change live state; pending event choices must be resolved first.
- Same-month foundation completion and power-study completion now appear in news. Sale-ready/operating months no longer get generic blocker advice.
- A blocked build can jump straight to permit inspection. The footer describes current choices rather than duplicating the prior-month report.
- Removed unused material-gradient definitions from each generated SVG, taking the authored SVG set from 859,240 to 471,654 bytes without changing rendered geometry.
- Validation: full unit suite 670 passed, then six receipt tests plus 12 review tests passed after the final fallback fix (671 unit tests total). Browser regressions: 40+38+39+39 passed, one detailed journey hit its 55s wall under shard load and passed separately in 29s. Lint/build and built-image decode passed. Actual early/result pixels inspected; both default desktop journeys complete.

## November 10 evening: starter turns with real choices
- Scenario-only month-end offers in the first three turns: spend $100K for 5 town trust; spend $250K for eight months of lower base shortage odds; borrow one next-month action point for 6 tenant trust. Each can be declined with no resource charge. Other scenarios cannot draw these cards.
- Choices are recorded in the frozen month history and count as decisions; crew training's expiry is reported from the actual flag. No fabricated normal-speed gain.
- In-progress stages now fade a blueprint into solid material instead of hiding all the frame until the reveal reaches it. Base and new-stage geometry remain aligned.
- Starter event previews use action/trust wording and a clear Confirm choice button.
- Validation: all 678 unit tests passed; 158 browser tests passed across four shards with the detailed review timeout and one shell-interrupted whale journey rerun separately (26.5s and 23.9s). Both default desktop full journeys and an accept-all early-offer route pass. Built-image decode, lint/build and diff checks pass. Actual offer and month-4 pixels inspected.

## November 10 evening: failure and paused-work pass
- Real-click no-build campaign reaches cash failure and restarts successfully. Its result now distinguishes cash for bills from unused construction commitments and names the missing foundation, rather than printing Game over: default.
- Deadline-loss warning selection keeps the termination cause, not a later unrelated conversion warning.
- An active order no longer implies progress: lender freeze, inspection failure and one-month stand-down have separate explanations. Active build orders are removed from the simple panel so the actual inspection repair is visible without scrolling.
- Both desktop full journeys, no-build loss, deadline-loss fixture, repair fixture, starter choices, monthly receipt and detailed terminal-loss checks passed. Unit suite 682 passed; lint/build, built decode and diff checks passed. Inspected actual cash-loss, deadline-loss and repair pixels.

## November 10 evening: truthful turn feedback and campus life
- Live turn feedback distinguishes unbought land, land ready for orders, active work, lender freeze, inspection stop and deliberate crew stand-down. Restored state without a monthly review no longer says Buy land.
- Working people and dust disappear while a funding freeze, failed inspection or stand-down stops construction.
- Fitted campuses get a connected entrance road, gatehouse, barrier, crossing and slow service van. Open campuses get parked cars and courtyard visitors. Night headlights and reduced-motion fallbacks checked in actual desktop screenshots.
- 686 unit cases and all 161 browser cases passed in four sequential shards. Built image decoding, lint/build and diff checks passed. Both complete default journeys also checked day/night and reduced-motion service traffic.
