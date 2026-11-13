# Hall warnings belong to their building

## Found in a real campaign
At 1280x720 the practice campus storm paused construction. The old HallSprite warning row sat at the empty top-right corner of the entire sprite rectangle. The pause icon floated over the perimeter tree line, apart from the hall it described.

## Change
Only the shared world camera moves the existing pause, inspection, late and closed badges to the upper center of the building artwork (48% across, 26% down). A light backing keeps warnings readable in night view. Empty warning rows remain invisible. The historical renderer and game rules are unchanged.

## Verification
- Actual practice campaigns at 1280x720 and 1024x720, with a deterministic new-game seed, reach the scripted storm, show funding hold, remove workers/equipment/work lights, then cure and sell.
- Warning position assertions are relative to each hall sprite, not viewport coordinates.
- Source parity checks exercise four-hall failed, paused, closed and late states. These are synthetic state checks, not separate actual campaigns.
- Removing only the new positioning CSS fails the actual storm test: badge center is 97.8% across the sprite instead of 48%.
- 792 unit tests, 3 focused source tests, 59 compiled desktop tests, lint and build passed.
- Inspected actual single-hall night pauses at both desktop widths and synthetic four-hall failed/closed/late pixels. Badge is attached to the building and no longer appears over trees.

Production replay follows deployment.
