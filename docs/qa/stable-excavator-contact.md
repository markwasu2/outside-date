# Stable excavator ground contact

A real production foundation order showed the whole excavator sliding sideways and back by 4 CSS pixels on fixed ground. The treads do not turn, and the bucket resting at ground level slides with them. Fixed-ground crops show both cycle extremes.

Remove only the whole-image excavator slide. Keep size, anchor, track/bucket artwork, shadows, placement transition and other vehicle behavior unchanged. The machine now stays planted rather than skating. No gameplay change.

Two real-order regressions cover 1024/1280 desktop widths, zoom, decoded tracked/bucket artwork, fixed transform and bounds after the short placement transition, day/night, reduced motion and undo. Restoring the old renderer fails the new check. Crane contact and shared camera checks still pass.

Verified 792 unit tests, 5 focused source cases, all 53 compiled-app browser cases, lint and build. Inspected compiled 1280 daylight and 1024 night pixels. Before/after images in ../screenshots/excavator-contact. Production replay is recorded separately in the work report.
