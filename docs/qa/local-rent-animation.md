# Local rent animation

Rent coins now rise beside each building instead of flying out of its map cell and across the monthly results. A clipped, noninteractive animation wrapper keeps the burst within the building-art frame. Rent tickers, building captions, monthly figures and reduced-motion behavior are unchanged.

## Verification

- All 752 unit, 254 browser and 27 built-app checks pass, plus lint/build.
- The new desktop regression reproduced the old out-of-bounds movement at 1280x720 and 1440x900. It now checks six sampled animation times and verifies coins are absent under reduced motion.
- The real six-hall expansion replay checks coin bounds after rent begins, captures day/night views and continues through sale.
- Inspected the real built six-hall day/night views and the four-hall 1440px view. Coins remain beside their building without crossing the captions or monthly results. Screenshots in `../screenshots/local-rent-animation/`.
- No costs, timing, game rules or controls changed.
