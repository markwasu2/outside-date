# Dry field groundcover

The dry-field tile now has shaded soil, a low cut edge, light contours, sparse groundcover patches and scattered grass tufts instead of a blank rhombus with six stalks. Its footprint, label, appearance timing and water-permit rules are unchanged. This is static deterministic artwork.

## Verification

- All 747 unit, 249 browser and 27 built-app checks pass, plus lint/build.
- Source check parses the SVG and checks the soil gradient and 32 grass tufts.
- Built multi-site check decodes the actual dry-field asset for the campus, siding and quarry choices and checks its detail group. Single-hall sites retain their existing hidden field behavior. Meadow retains the pond asset.
- Inspected actual built quarry day/night and six-hall campaign pixels. Field art remains within the existing tile, away from the road and controls.
- Screenshots: `../screenshots/dry-field-groundcover/`.
