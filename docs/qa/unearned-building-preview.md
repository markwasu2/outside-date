# Show only earned building progress

The next hall stage used a minimum opacity of 12% even at zero progress. A completed steel frame therefore contained faint future walls before the player ordered wall work. A terminated hall could also show a future stage at 45% opacity with no progress.

The upcoming stage now uses actual progress for opacity, with the existing dimming applied to that progress if terminated. Completed structure remains underneath. Pauses keep their progress. No construction math, timing, costs or controls changed.

## Verification

- All 758 unit, 260 browser and 27 built-app checks pass, plus lint/build.
- New unit checks cover inactive/active zero progress, paused half progress and terminated zero/half progress.
- New 1280/1440 browser cases cover frame, walls, interiors and stopped work states.
- Real built construction replay completes the frame and verifies the next shell has zero progress and zero opacity while the completed frame remains visible.
- Inspected actual built frame day/night pixels and the larger desktop fixture. The open frame no longer contains ghost walls.
- Full one/four/six-hall campaigns still complete through sale.
- Screenshots in `../screenshots/unearned-building-preview/`.
