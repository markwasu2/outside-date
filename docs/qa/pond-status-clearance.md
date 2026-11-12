# Pond status clearance

The meadow pond status could extend past the left viewport edge at desktop 1280. Its full wording now wraps within its existing map label. No permit behavior, costs or game timing changed.

## Verification

- All 754 unit, 257 browser and 27 built-app checks pass, plus lint/build.
- New 1280 and 1440 desktop cases check viewport bounds and horizontal overflow for needs wetlands permit, mitigation underway and blocks one hall pad.
- Real built site-selection replay buys meadow land and verifies the full permit status remains visible within the viewport.
- Inspected actual 1280 day and 1440 night pixels and built meadow day/night images. The status is readable and stays inside its map label.
- Built assertion initially ran before land purchase, when status labels are intentionally hidden. Corrected the test to inspect the real post-purchase meadow state; all built shards pass.
- Screenshots in `../screenshots/pond-status-clearance/`.
