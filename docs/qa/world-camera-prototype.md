# Shared-world camera prototype

Local opt-in visual/gameplay experiment. Not the default map and not ready to replace it.

Enable `outside-date-world-campus-preview=true` in local storage before reloading. It applies only to simple view with more than one hall. Detailed view and single-hall campuses retain the current map. No engine or content changes.

## What changed

- Fixed physical world dimensions for halls, utilities and roads, with a larger site as hall count grows.
- One measured, uniform camera, fit view, 1.7x zoom and native scrolling.
- Screen-space captions, action controls and panels stay readable while art shares one scale.
- Existing HallSprite stages, active equipment, inspection/funding pauses, operating fans, rent and night lights.
- Grounded owned woodland, gatehouse, parking, transmission poles and ambient road vehicles.
- Action receipts clear on month advance instead of lingering over the next month's empty order list.
- Existing engine action panels, finance, permits, power supply, water and contacts routes retained.

## Verification so far

- 769 unit tests pass, including two physical-layout tests.
- Lint and production build pass.
- A real deterministic Whale campaign expands from four to six halls and reaches sale through ordinary controls. Repeated source-browser and production-bundle replays pass.
- The replay also checks fit/zoom ratio, opens H6 after scrolling and checks panel bounds, and resizes to 1024x768 and 1536x960.
- Source-fixture visual tests cover two through six halls, four terrain themes, transmission-pole counts, machine/crew/office proportions, contacts and Escape-to-close.
- Eight existing default-map regressions pass: office, gatehouse, lights and construction equipment at two desktop sizes.
- Pixels inspected for real developed day/night, zoomed H6 panel, both desktop resize cases, two/four/six-hall work scenes and meadow.

## Still needed

- This is not a full release regression or a live replay. Nothing has been pushed or deployed.
- Final art-direction pass. Ground treatment is still simpler and more orthogonal than the shipped campus scene. The artwork remains a compact illustrated campus, not a literal survey of a full-size data-center site.
- Check compact four-hall and six-hall early-game receipts, complete theme-specific field/pole context, and check all utility/finance panels while zoomed and scrolled.
- Check blocked, terminated, late, paused and liquid-cooling edge cases in the new camera.
- Fit/zoom button placement can crowd the crew caption at the bottom edge after scrolling.
- Review shared renderer extraction before making this the default. Avoid maintaining two versions of gameplay display rules indefinitely.
- Full source browser regression, full built suite and production inspection before any default-map release.

The static standalone visual study was removed once the real playable prototype worked. The local opt-in remains reversible.
