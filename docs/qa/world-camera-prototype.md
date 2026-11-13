# Shared isometric world camera

Shared isometric camera is now the default for simple multi-hall campuses in this branch. Pending merge and deployment verification.

It applies only to simple view with more than one hall. Detailed view and single-hall campuses retain the current map. A local development override, `outside-date-world-campus-preview=false`, retains the legacy map for parity checks. No engine or content changes.

## Geometry and behavior

- Fixed physical dimensions for halls, utilities, people, trees and equipment, independent of hall count.
- Ground x/y axes use the exact `.866, .5` orthographic projection of `campus-art.py`. Upright z is unscaled.
- Site extent grows with hall count. A measured uniform camera offers fit view and 1.7x zoom with scrolling.
- Roads, hall aprons, service yard, power yard, parking, perimeter and woodland use that same ground plane.
- Owned gatehouse, natural tree art and real game art are reused. Freight, passenger and service vehicles use the same isometric ground axes with upright body height and separate road lanes. The zoomed view explains scrolling. Turf no longer ends in a rectangular seam.
- Compact clickable hall placards keep identity, stage/progress and direct build actions near the hall. Direct orders show their point cost and when building costs are paid. Full status remains available in accessible text, hover text and the hall's unchanged action panel.
- Existing HallSprite stages, active equipment, inspection/funding pauses, operating fans, rent, coins and night lights remain.
- Utility, water, contacts, power supply and finance use existing action panels, held inside the viewport during zoom/scroll.
- Receipts clear on month advance rather than lingering over the next month's empty order list.
- Both cameras now share `hallDisplay` for stage offsets, funding state, warnings and rent. The old default behavior is unchanged by that extraction.

The earlier rectangular-ground version is preserved in local commit `32eb20b`. Its mismatched ground/building axes were rejected after pixel inspection. The static isometric study led to this playable version.

## Verification

- 772 unit tests pass, including physical-camera and shared display checks.
- Lint and production build pass.
- All 283 source-browser cases pass after default adoption, run in eight shards with two workers plus targeted reruns of migrated layout assertions. The last shard was split to stay within execution limits.
- All 33 built-app tests pass after default adoption, in eight shards with one worker. This includes real four/six-hall default campaigns, plant buildout/date semantics and through-sale checks.
- A deterministic real Whale campaign expands from four to six halls and reaches sale through ordinary controls. Source and built-bundle replays pass repeatedly.
- That replay also checks 1.7x camera ratio, H6 inspection after scroll, panel bounds, and 1024x768/1536x960 desktop resizing.
- Fixture checks cover two through six halls, four terrain themes, pole counts, machine/crew/office proportions, contacts and Escape-to-close.
- Seven cases compare old/new display semantics: permit blocked, funding freeze, failed inspection, termination, delivered rent, lateness and liquid cooling.
- Four- and six-hall early receipts avoid all caption anchors. Every utility/contact/finance panel remains inside the scene after zoom/scroll.
- Actual pixels inspected after the final build: real developed six-hall day/night, zoomed H6 panel, 1024 desktop; earlier inspections include wide desktop, two/four/six-hall construction, meadow, failed inspection, liquid cooling, termination, receipts and finance.

## Default-adoption review

The initial opt-in checks did not validate adoption. The default-path pass found and fixed missing delayed-plant/approved-docket wording and delivery-timing captions before release. Plant captions now sit below their art. Power-state captions no longer collide with the cooling-yard caption. Terrain checks now accept the new shared ground instead of requiring the rejected rectangular background image. Single-hall checks still require and decode the original ground image.

Old expansion tests pinned arbitrary rectangular percentages and z-index values. Their replacements require all hall art and visible controls inside the viewport, unchanged sprite proportions, working open-hall inspection, direct build actions and subsequent active-work explanation. Developed-ground tests retain the old detailed checks for one hall and check real aprons, parking, gatehouse, traffic, visible hall placards and night pools for multi-hall scenes.

Final compiled-app pixels inspected: real six-hall day/night, 1024 desktop and zoomed H6 panel. Direct-order cost placards and construction receipts were also inspected. This is coherent stylized isometric art, not a photorealistic survey. Fit view keeps every utility visible; zoom offers detail and scrolling.

## Release follow-through

- Merge and deployment have not yet been verified as of this note.
- After release, replay the actual published default map and inspect its pixels. Do not confuse a local built pass with production.
