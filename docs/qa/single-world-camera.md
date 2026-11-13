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
- The 288-case source-browser suite was exercised across eight shards. Initial oversized concurrency caused timeouts; later two-worker runs were stable. Adoption failures were corrected and targeted cases rerun. Several shards were cut short by command duration and covered by named reruns. A fresh full source-suite shard pass remains the final pre-release check, rather than presenting that interrupted aggregate as a clean all-green run.
- Inspected actual compiled-game 1024 sale and 1280 night pixels, plus construction, opening, wetlands, arrival-highlight and multi-hall fixtures. Screenshots in `docs/screenshots/single-world/`.
- Exact historical renderer tests opt out explicitly. Default journeys and shared-world scale tests do not opt in, so they prove the changed default.

## Release state

Local only. No push, PR, merge or production deployment yet. Next: fresh source-regression shards, review final diff, ship, then replay the production bundle and inspect production pixels.
