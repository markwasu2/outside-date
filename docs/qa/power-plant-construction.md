# Power plant erection state

Plants labeled "building" used to show complete power stations. They now show exposed framing, cross braces, unfinished stack bases, a lifting mast and staged materials on the same pad. Online plants retain their existing completed art, byte for byte. Waiting plants retain their surveyed plots.

## Verification

- All 748 unit, 252 browser and 27 built-app checks pass, plus lint/build.
- The actual six-hall built campaign checks both building and online plants, decodes their bundled art, verifies construction markers only before online, and checks image/caption clearance. It continues through a real six-hall sale without page errors.
- Inspected building and online day/night screenshots at 1280x720. Erection is distinct from finished stations and stays inside the previous art space, clear of captions. Screenshots are in `../screenshots/power-plant-construction/`.
- Regenerating all campus art changes only `plant-building.svg`; other assets stay byte identical.
- No game rules, plant timing, power capacity, costs, controls or state transitions change.
