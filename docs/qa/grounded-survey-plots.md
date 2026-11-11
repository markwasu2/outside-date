# Grounded survey and foundation

Unbuilt halls previously looked like thick beige platforms floating above the dirt. They now show dashed survey lines, measured cross marks and four stakes directly on the existing terrain. The transparent plot lets every site's ground show through. Completed foundations retain their concrete pours and column footings, with a much tighter contact shadow rather than a large floating blur.

Building size, camera, build controls, foundation costs and all later-stage illustrations are unchanged. Power and optional land survey art is unchanged.

## Verification

- 747 unit checks, 235 desktop browser checks, 27 built-app checks and lint/build pass.
- New source and built checks load the actual survey SVG, verify four dashed edges, four stake boxes and no filtered survey parent, decode the image and capture day/night pixels.
- Inspected actual built opening day/night and completed foundation with the next frame ghost, plus four-hall construction. Survey marks sit on the dirt; concrete contact stays tight to the ground; labels and controls remain readable.
- Full one/four/six-hall click journeys complete through sale. Foundation/frame progression passes.
- `scripts/campus-art.py --only-halls` is deterministic; only the two intended generated hall SVGs change. Whitespace check is clean.
- Screenshots: `../screenshots/grounded-survey-plots/`.
