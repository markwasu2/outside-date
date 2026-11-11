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

## November 10 evening: show what the actual choice changed
- Monthly bar now retains the last chosen event answer with its immediate cash, trust and next-month-point effects. Crew training also shows its actual expiry.
- Choice effects come from the committed choice state before the world tick. An accepted $100K open house is not blamed for the entire month's cash burn. Capped trust gains use the actual gain rather than the authored maximum. Existing saves/history without effects remain readable.
- 691 unit tests passed. Thirteen targeted browser cases passed: accept all opening choices, frozen monthly results, both complete desktop journeys, generic/bespoke event cards, terminal-event handling, detailed review-to-sale and whale fast-forward. Lint/build, built image decoding, diff check and actual training/walkthrough pixels passed.

## November 10 evening: recover after overlooking power
- Real-click alternate campaign deliberately ignored power through month 17 after finishing interiors. Then commissioned the study and ordered equipment, opened, and sold in month 24 without restarting.
- The blocked building now links straight to the correct power view. An unbuilt connection points to study/equipment; a completed connection points to capacity; capacity ready for next tick gives the automatic hookup instruction instead of asking for duplicate work. The footer names the testing blocker.
- The simple power-capacity view reports finite capacity and says when waiting cannot fix a permanent gap. Event trust arrows now say immediate event effects are separately recorded rather than claiming they cannot be isolated.
- 692 unit cases passed. Nine targeted browser cases passed across real delayed-power recovery, both normal build-to-sale journeys, ready-hookup/permanent-capacity fixtures, detailed power timing and all opening choices. Lint/build, built-image decoding, diff checks and actual blocker/recovery/capacity pixels passed.

## November 10 evening: operating-building night lighting
- Night view lights selected upper windows and entrance glass using the same camera and window coordinates as the original building illustration, with a small pool of light on the entrance pavement.
- Lighting is purely visual and only appears for an opened, non-terminated building. It never suggests that an unpowered shell is operating. Day view is unchanged.
- Eight targeted browser cases passed across both full desktop journeys, delayed-power recovery, hookup/capacity fixtures, original-art and multi-hall bounds, and paused inspection handling. Actual 1280/1440 night pixels, lint/build, built-image decode and diff checks passed.

## November 10 evening: missed permits and inspectable active work
- A real-click player starts foundation before filing the building permit, follows the blocked building's permit link, files late, and still reaches a sale. Footer now distinguishes never-filed, pending with its actual decision month, and denied reviews.
- Active work is inspectable from its visible map button rather than disabled. Funding-paused work explicitly says Inspect paused work; inspection failures retain the direct repair action.
- 693 unit cases, nine targeted browser cases, lint/build, built image decoding and diff checks passed. Inspected actual permit-filing and funding-paused pixels. Both complete desktop journeys and delayed-power recovery still pass.

## November 10 evening: construction materials follow the build
- Added original, same-camera steel-bundle and cladding-panel yard illustrations. Structure gets lifting equipment, walls get a delivery truck, and later buildout gets cooling/backup yards. A permanent excavator no longer stands beside every construction stage.
- Removed the duplicate generic laydown illustration from the simple map while preserving actual order counts, delivery notices and the inspectable yard. Detailed map art remains unchanged.
- Twelve targeted browser cases passed across stage transitions, original asset bounds, yard count, both normal build-to-sale journeys, late power/permit recovery and paused work. Actual steel/panel stage pixels, lint/build, built image decoding and diff checks passed. No game-state changes.

## November 10 evening: finished work gets a small reward
- Newly completed milestones get a brief result-bar highlight and the existing optional milestone tone. No bonus is invented, no modal blocks the game, and a setback keeps its warning treatment rather than a green celebration.
- Months resolved after a choice now run the same fresh-warning and transition-sound checks as ordinary months. Previously this path silently skipped those checks, including real foundation completions in the opening month.
- Sound remains off by default and honors mute. New orders do not repeat the completion tone. Reduced-motion disables the highlight. A real-click browser check observes the one milestone tone through a test audio stub and verifies mute/reduced-motion behavior.
- 695 unit cases and twelve targeted browser cases passed across milestone feedback, monthly results, opening choices, ordinary desktop completion, late permit recovery, losses, partner-dispute event and detailed/whale paths. Actual foundation pixels, lint/build, built image decoding and diff checks passed.

## November 10 evening: keep the last result when returning
- Continue saved game now restores the frozen last monthly result, including the exact chosen event and its immediate effects. New orders after that result do not rewrite it when reloading again. Exported saves carry the same optional report.
- Existing version-eight saves without report history remain usable; no history is fabricated. If the report makes local storage exceed its quota, save the core game without the optional report. Disabled storage still cannot break play.
- 699 unit cases and ten targeted browser cases passed: real reloads before/after new orders, legacy-save omission, both regular full desktop journeys, late permit/power recovery and milestone/mute behavior. Unit checks cover migration, exact report serialization, quota fallback and unavailable storage. Actual reload pixels, lint/build, built image decoding and diff checks passed.

## November 10 evening: accurate sale return and a way back
- Simple sale results reuse the precise return label from the detailed report. An actual 0.996x result says just under 1.00x rather than rounding a loss into apparent break-even.
- Full report has Back to summary so a simple-mode player can inspect details and return without restarting or going to the title.
- Five browser cases passed: engine-priced near-break-even sale, return-to-summary and restart, both full regular desktop journeys, no-build loss/restart and deadline-loss fixture. Sixteen report unit cases, lint/build, built image decoding, actual sale pixels and diff checks passed.

## November 10 evening: the early construction compound
- Early construction now has temporary gravel access, tire tracks, separate laydown pads, cones and a small safety barrier instead of a single blank sand field.
- These are scenery included in construction, not new purchases, money, road capacity or automatic progress. They are replaced by the finished road/courtyard when fit-out starts.
- Inspected foundation, steel, panels, fit-out, day and night at desktop size. Stage-yard checks enforce the construction/finished transition. Both full desktop playthroughs, paused-work routes, long-campaign fast-forward, 699 unit cases, lint/build and built-image decoding passed. Prior sale step full regression is 171 cases, including a rerun of the long campaign after the first test runner was interrupted.
