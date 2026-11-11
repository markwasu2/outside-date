# Night road lighting (verification in progress)

Road trucks and cars have direction-matched fading headlights and tail lights only at night. The active construction service truck uses the same night treatment and still disappears when work is undone. Day traffic, animation cadence and reduced-motion behavior are unchanged. No finance, progress or gameplay effects.

Pixels inspected at 1280x720 for idle night opening and an actual purchased site with a foundation order. Initial hard beam edges were replaced with fading gradients after inspection.

Completed checks:
- 731 unit tests, lint and production build pass.
- Twelve built-app journeys pass with the first version of the new traffic test.
- Expanded traffic test passes with actual land, permit, foundation and undo actions.
- Full browser shard 1/4: 49 passed.

Still required before merge: browser shards 2-4, expanded built test, final lint/build and deployment replay. This file records work in progress, not a shipped claim.
