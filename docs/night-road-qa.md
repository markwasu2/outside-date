# Night road lighting

Road trucks and cars have direction-matched fading headlights and tail lights only at night. The active construction service truck uses the same night treatment and still disappears when work is undone. Day traffic, animation cadence and reduced-motion behavior are unchanged. No finance, progress or gameplay effects.

Pixels inspected at 1280x720 for idle night opening and an actual purchased site with a foundation order. Initial hard beam edges were replaced with fading gradients after inspection.

Verification:
- 731 unit tests, lint and production build pass.
- Twelve built-app journeys pass, including the expanded actual-order/undo traffic test.
- Expanded traffic test passes with actual land, permit, foundation and undo actions.
- All 195 distinct browser cases pass, reconciled against the complete test list. The slow month-review journey ran separately to keep each runner within its command limit.

Production deployment and live replay follow the merge. No repository-visibility changes.
