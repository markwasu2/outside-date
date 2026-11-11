# Hall opening highlight

Opening a hall used to animate a green rectangular ring around the whole map cell, including empty ground. The opening now adds a short, soft glow around the building art. Delivery, crate and plant arrival highlights keep their existing treatment. Reduced-motion mode disables the glow.

## Verification

- All 747 unit, 237 browser and 27 built-app checks pass, plus lint/build.
- A controlled newly-opened hall test checks no cell shadow or cell animation, the building animation, and reduced-motion behavior. Inspected day/night captures at a paused animation peak. These are visual fixtures, not completed campaigns.
- The actual built six-hall campaign checks each newly opened hall has no cell shadow and uses the building animation, then completes all six halls and sells. Inspected its month 49 image: H4 no longer has an empty-cell green rectangle.
- Full source and built one/four/six-hall regressions pass. No rules, timing, footprint or art assets change.
- Screenshots: `../screenshots/hall-opening-highlight/`.
