# Closing-card terrain aspect

Closing cards previously stretched a landscape SVG to a tall panel. The source SVG deliberately disables its own aspect preservation for the live map, so `object-fit: cover` did not prevent long thin trees and fences on closing cards.

The closing card now keeps the terrain image at its authored 3:2 aspect ratio, centers it, and clips the sides inside the panel. Hall art, labels, status and the live game map are unchanged. Cropping intentionally removes terrain at the edges; the chosen site's terrain asset is still used.

## Verification

- 759 unit, 260 browser and 27 built-app cases pass, plus lint/build.
- Added measured 3:2 image-ratio assertions for four/six-hall closing cards and all four site terrain choices.
- Added the same ratio assertion to the real built six-hall expansion/sale journey.
- Inspected six-hall built sale, four/six-hall loss and single-hall meadow/quarry loss pixels. Trees have their original proportions; captions, hall art, power status and buttons remain visible within 1280x720.
- Evidence in `../screenshots/closing-terrain-aspect/`.
- No game rules, save schema or outcome calculations changed.
