# Single-hall shared ground camera

## Scope

Extend the simple-mode shared camera to the first single-hall campus. Detailed mode stays on its existing renderer. The `outside-date-single-world-preview=false` local override retains the historical single-hall renderer for asset-layout regression tests. No game rules, repo visibility or other project changes.

## Changes

- One camera for the hall, office, equipment, road vehicles and people. Physical sprite dimensions remain fixed across hall counts.
- A longer single-hall perimeter keeps the backup yard inside the owned site. A separate courtyard occupies the empty second-row land, not a backdrop behind the hall.
- Four grounded shade trees, benches, two opening-only visitors, low utility planting and an operating service van.
- Single-hall build controls keep full instructions rather than the multi-hall compact caption. Rent is a keyboard-accessible inspection button connected to Money.
- Adoption checks restored power completion dates and the new-hall art highlight. Water permit status stays inside its field control.

## Verification so far

- 775 unit tests pass. Lint and production build pass.
- 35 compiled-app tests pass across four shards and a targeted correction rerun. These include default 1024/1280 single-hall build-to-sale, custom air/liquid/meadow/siding sales, four-hall sale, six-hall expansion, no-power loss and legacy asset-layout coverage.
- All 288 source-browser cases now pass in fresh two-worker 16-shard runs. Shard 16 was interrupted by a combined command duration cap after shard 15; its full standalone rerun passed all 18. Earlier migration failures and overloaded-run timeouts were corrected before this clean pass.
- Inspected actual compiled-game 1024 sale and 1280 night pixels, plus construction, opening, wetlands, arrival-highlight and multi-hall fixtures. Screenshots in `docs/screenshots/single-world/`.
- Exact historical renderer tests opt out explicitly. Default journeys and shared-world scale tests do not opt in, so they prove the changed default.

## Release state

Source and compiled verification complete. Release candidate ready; production deployment and replay remain pending.
