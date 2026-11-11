# Night ground contact

The night stylesheet was adding a second, long drop shadow to every hall image, including transparent surveys and low foundations. Survey marks now use only the existing night tint. Foundations retain a small contact shadow. Steel, enclosed and occupied building shadows are unchanged.

Each image carries its own completed or growing art stage, so cross-fades get the right shadow independently. No construction rules, geometry or controls change.

## Verification

- 747 unit, 235 browser and 27 built-app checks pass, plus lint/build.
- Source and built survey checks require the actual night tint without a drop shadow.
- The built foundation journey checks the low contact shadow, captures actual night pixels and continues through frame completion.
- Inspected actual built survey night, foundation night and six-hall day scenes. Surveys sit directly on the soil and foundations retain a short shadow; labels remain readable.
- Full one/four/six-hall campaigns, night work-light pause checks, reduced-motion checks and source/built progression pass.
- Screenshots: `../screenshots/night-ground-contact/`.
