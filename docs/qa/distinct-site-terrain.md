# Site terrain - desktop

The full-campus illustration was opaque, hiding the site-specific background color. Pond and pole clues changed with the site, but the surrounding landscape stayed the same.

The existing site themes now select original generated terrain:
- Default campus: unchanged.
- Meadow: greener ground and planted field rows beyond the access loop.
- Quarry: muted rocky ground and fractured ledges beyond the access loop.
- Depot: weathered ground and an old siding beyond the access loop.

Roads, parking, build coordinates, click targets and game rules are unchanged. Terrain selection follows the authored site theme, not power capacity, study duration or other guessed mechanics. Unknown themes retain the default campus.

Verification:
- 739 unit tests, lint and production build pass.
- All 198 distinct browser tests pass, reconciled against the full listing.
- All fifteen built-app desktop journeys pass, including actual site selections for campus, meadow, depot and quarry.
- Inspected day/night screenshots at 1280x720. The terrain stays behind labels and build controls. Quarry was also inspected with four halls in simple view.
- Full art regeneration leaves all 33 SVGs byte-identical.
- Production replay follows deployment.

Screenshots: `docs/screenshots/site-terrain/`.
