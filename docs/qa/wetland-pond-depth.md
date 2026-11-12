# Wetland pond depth

The meadow pond now has a curved shallow bank, shaded water, small ripples, reeds and shoreline stones instead of a flat polygon. This is illustration only: the water-permit rules, mitigation state, location and build controls are unchanged.

## Verification

- All 747 unit, 243 browser and 27 built-app checks pass, plus lint/build.
- Source check requires curved bank paths, the water gradient and reed geometry. Built terrain selection at desktop 1280 verifies the actual loaded meadow pond image includes the new group and decodes.
- Inspected actual built meadow day/night scenes reached through the normal custom-campus setup. The shoreline stays outside the access loop, away from the hall parcel and controls.
- Full art regeneration is deterministic. Only the pond SVG changes.
- Screenshots: `../screenshots/wetland-pond-depth/`.
