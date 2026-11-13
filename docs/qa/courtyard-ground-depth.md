# Courtyard ground depth

Fresh production campaign, sale-ready campus, zoomed and scrolled to the south courtyard: the second visitor painted over the canopy of a tree rooted in front of them. The visitor looked perched on the tree. Before crop records the defect.

Paint courtyard trees, visitors and benches in ground-depth order (world x+y). Keep their existing positions, sizes, artwork, shadows and counts. The front tree now naturally hides the visitor behind it; the other visitor stays visible on the path. No gameplay changes.

The existing actual single-hall journey now checks all eight courtyard objects' paint order at 1024/1280, then captures zoomed day/night pixels before completing the sale. Removing only the sort while retaining all object metadata fails the regression.

Verified 792 unit tests, 3 focused source cases, all 53 compiled-app cases, lint and build. Inspected compiled 1280 daylight crop/full scene and 1024 night pixels. Before/after in ../screenshots/courtyard-depth. Production replay is recorded separately in the work report.
