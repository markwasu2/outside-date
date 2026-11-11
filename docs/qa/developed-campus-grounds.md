# Developed campus grounds

The finished campus now has a concrete service court under the halls and a separate utility apron. Subtle slab joints, pale edge strips and a shrub boundary separate the developed compound from the surrounding land. These are included scene details, not additional purchasable roads or capacity.

The low surface SVG sits at z-index 0. Building art, controls, roads, perimeter fencing and equipment stay in their existing layers. Early construction and detailed mode are unchanged. Night mode dims the new surfaces with the rest of the scene.

## Verification

- 747 unit tests pass.
- 226 browser tests pass across eight shards.
- 26 built-app tests pass across three shards, including actual one-, four- and six-hall campaigns to sale.
- Lint and production build pass.
- Added three desktop checks for one/four/six halls: surfaces are absent before fitting, remain below buildings/roads, never intercept clicks and dim at night. Slab-joint paths explicitly have no fill.
- Inspected actual one-hall sale, four-hall power wait, six-hall construction and day/night fixture pixels at 1280 x 720. Building silhouettes and captions remain visible; the concrete no longer paints over buildings.
- Screenshots: `../screenshots/developed-grounds/`.

Visual fixtures synthesize the displayed development state and are not balance or rent evidence. Actual full campaign replays remain the completion evidence.
