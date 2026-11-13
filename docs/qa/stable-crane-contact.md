# Stable crane contact

A real single-hall frame order revealed the whole crane image rotating from -1 degree to +1.5 degrees. Its wheels and deployed stabilizer feet slid across the fixed foundation. Enlarged before-cycle crops show both extremes.

Remove only that whole-image animation. The SVG's existing internal boom motion remains. Chassis, feet, scale, anchor, shadows and game rules are unchanged. Excavator and delivery-truck behavior are not changed by this pass.

The source-free real build-order regression checks fixed chassis transform and bounds at desktop 1024/1280, existing internal boom animation and reduced-motion rules in the asset, day/night and undo. Restoring the original tilt makes the regression fail. It runs against both source and the compiled bundle.

Verified 786 unit tests, 5 focused source-browser cases, all 45 compiled-app cases, lint and build. Pixels inspected at both desktop widths. Screenshots in ../screenshots/crane-contact. Production replay is recorded separately in the work report.
