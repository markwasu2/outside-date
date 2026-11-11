# Multi-hall campus service clearance

Two-to-four-hall simple campuses now use the same inner service-court boundary as expanded campuses. Lower buildings sit above the road, and the building layer stays above the road layer. Compact Inspect controls replace wide idle controls in all multi-hall campuses. Delivered halls remain clickable and keyboard-accessible without a redundant disabled button. Named direct build orders are unchanged.

The one-hall and detailed layouts are unchanged. No engine, timing, cost, rent or capacity changes.

## Verification

- 747 unit tests, 232 browser tests and 26 built-app tests pass. Lint/build pass.
- Ten desktop fixtures cover two through six halls at 1280 and 1440: hall and art bounds stay above the road, delivered-hall inspection works, and a named frame order opens active inspection afterward.
- Actual four-hall campaign still completes through a sale. Inspected its month-41 power-wait screen: all four buildings and the smaller Inspect controls are visible above the service road.
- Inspected two-, three- and four-hall mixed-stage desktop pixels. No road cuts the lower-row art; direct build controls and building selection remain usable.
- Screenshots in `../screenshots/multi-hall-clearance/`. Mixed-stage fixtures are not rent or balance evidence.
