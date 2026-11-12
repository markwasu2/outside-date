# Online plant structure

The online station now has round exhaust stacks with thin collars instead of square stacks with shelf-like collars. The service building has a folded roof edge, standing seams, glazed roof intakes, service doors and a landing. Recessed intake banks break up the side enclosure. Stack height, pad, camera and plant captions stay in their existing space.

## Verification

- All 759 unit, 260 browser and 27 built-app checks pass, plus lint/build.
- Source-art tests require service building, intake bank and exhaust markers exactly once in online art and never in erection art.
- Real six-hall built replay checks the markers only after online, decodes images, checks image/caption clearance and continues through sale.
- Inspected actual built map day/night views and an enlarged art render. Stack shapes remain readable at map size and clear of labels.
- All 34 generated asset hashes are stable after regeneration. Only plant-online.svg changes; waiting, erection and vehicle assets are byte-stable.
- No rules, power capacity, costs or timing changes.
- Screenshots in `../screenshots/online-plant-structure/`.
