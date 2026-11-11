# Clearer building materials

Pale cladding now contrasts with the graphite roof and shaded service side. Roof seams are quieter, while the existing entry, windows, service doors, roof equipment, solar panels and landscaping stay intact. The same materials carry through shell, fitout, testing and occupation. Pad and steel art are unchanged.

The authored geometry, camera, footprints, stage logic and operating overlays are unchanged. This is a palette-only art pass, not a construction or balance change. The generator owns the palette so regeneration retains the material separation.

## Verification

- 747 unit tests, 233 browser tests and 26 built-app tests pass. Lint/build pass.
- A new browser check fetches all four stage assets and checks their shared facade, shade and roof palette, SVG bounds and native geometry.
- Inspected the stage contact sheet plus actual one-hall day/night, four-hall power wait and six-hall construction screenshots. Roof equipment and stage differences remain visible; cladding separates from the court without changing footprints.
- Actual one/four/six-hall campaigns complete through sale.
- Regenerating with `python scripts/campus-art.py --only-halls` retains the same SVGs.
- Evidence: `../screenshots/building-materials/`.
