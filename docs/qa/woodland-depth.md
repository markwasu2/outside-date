# Woodland depth in the desktop camera

The wide map camera was flattening the perimeter trees. The side woodland now keeps taller crowns and trunks; the topmost trees remain shorter to leave the public road clear. Foreground trees sit below the fence so the fence no longer cuts across their crowns. All four site themes share the same woodland placement, with their fields, quarry ledges and siding retained.

Building, road, utility, selection and construction coordinates are unchanged. No engine or game-state changes.

## Verification

- 747 unit, 234 browser and 26 built-app tests pass. Lint/build pass.
- New asset checks inspect all four terrain variants for retained bounds, woodland and camera compensation.
- Inspected actual one-hall sale and six-hall construction screens, plus meadow daytime and quarry nighttime scenes at 1280 x 720. Trees stay outside the hall court and public road; foreground crowns remain below the fence.
- Actual one/four/six-hall campaigns still complete to sale.
- Ground regeneration is deterministic and retains all four authored variants.
- Screenshots: `../screenshots/woodland-depth/`.
