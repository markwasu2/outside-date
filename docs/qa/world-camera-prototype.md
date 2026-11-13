# Shared isometric world camera

Local opt-in playable prototype. Not the default map and not deployed.

Enable `outside-date-world-campus-preview=true` in local storage before reloading. It applies only to simple view with more than one hall. Detailed view and single-hall campuses retain the current map. No engine or content changes.

## Geometry and behavior

- Fixed physical dimensions for halls, utilities, people, trees and equipment, independent of hall count.
- Ground x/y axes use the exact `.866, .5` orthographic projection of `campus-art.py`. Upright z is unscaled.
- Site extent grows with hall count. A measured uniform camera offers fit view and 1.7x zoom with scrolling.
- Roads, hall aprons, service yard, power yard, parking, perimeter and woodland use that same ground plane.
- Owned gatehouse, natural tree art, traffic details and real game art are reused.
- Compact clickable hall placards keep identity, stage/progress and direct build actions near the hall. Full status remains available in accessible text, hover text and the hall's unchanged action panel.
- Existing HallSprite stages, active equipment, inspection/funding pauses, operating fans, rent, coins and night lights remain.
- Utility, water, contacts, power supply and finance use existing action panels, held inside the viewport during zoom/scroll.
- Receipts clear on month advance rather than lingering over the next month's empty order list.
- Both cameras now share `hallDisplay` for stage offsets, funding state, warnings and rent. The old default behavior is unchanged by that extraction.

The earlier rectangular-ground version is preserved in local commit `32eb20b`. Its mismatched ground/building axes were rejected after pixel inspection. The static isometric study led to this playable version.

## Verification

- 772 unit tests pass, including physical-camera and shared display checks.
- Lint and production build pass.
- All 283 source-browser tests pass, run sequentially in 16 shards with two workers.
- All 33 built-app tests pass, in three shards with one worker.
- A deterministic real Whale campaign expands from four to six halls and reaches sale through ordinary controls. Source and built-bundle replays pass repeatedly.
- That replay also checks 1.7x camera ratio, H6 inspection after scroll, panel bounds, and 1024x768/1536x960 desktop resizing.
- Fixture checks cover two through six halls, four terrain themes, pole counts, machine/crew/office proportions, contacts and Escape-to-close.
- Seven cases compare old/new display semantics: permit blocked, funding freeze, failed inspection, termination, delivered rent, lateness and liquid cooling.
- Four- and six-hall early receipts avoid all caption anchors. Every utility/contact/finance panel remains inside the scene after zoom/scroll.
- Actual pixels inspected after the final build: real developed six-hall day/night, zoomed H6 panel, 1024 desktop; earlier inspections include wide desktop, two/four/six-hall construction, meadow, failed inspection, liquid cooling, termination, receipts and finance.

## Still needed before a default-map release

- Nothing has been pushed, merged or deployed. The regression above proves old-default safety plus explicit opt-in behavior, not automatic adoption of the new map.
- Test default adoption deliberately. Existing default-map visual checks pin rectangular layouts and need review, not blind assertion replacement. Keep single-hall and detailed view unaffected unless intentionally expanded.
- Review compact placard legibility and direct-build cost/AP discoverability for a cold player. In fit view the entire campus is visible but buildings are smaller; zoom gives the detail view.
- Consider a larger default camera or clearer panning affordance if fit view is too distant. Do not crop utilities silently.
- Finish any desired traffic/service detail and night-ground lighting work using actual pixels.
- Verify production deployment and replay the shipped map after any eventual release. No production result exists for this prototype yet.
