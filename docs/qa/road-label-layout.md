# Road label layout

Grouped the land/access and pole labels horizontally at the left edge of the road. Removed the fixed horizontal translation that left them stacked at road center under passing traffic. The land button remains centered. Detailed-mode labels retain their existing flow. No gameplay changes.

## Verification

- All 747 unit, 248 browser and 27 built-app checks pass, plus lint/build.
- Source checks at desktop 1280 and 1440 assert labels share a row, do not overlap and stay clear of the land button.
- Actual built campaigns at both sizes assert the same label geometry and finish through sale.
- Inspected source opening/owned-site/night and actual built one-hall day/night and six-hall pixels. Labels are readable and clear of controls.
- Screenshots: `../screenshots/road-label-layout/`.
