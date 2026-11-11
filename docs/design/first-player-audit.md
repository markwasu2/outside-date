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
