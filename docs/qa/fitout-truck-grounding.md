# Crew truck ground contact

Actual production play through the interiors order showed the rear tires overlapping the hall wall. The long truck inherited the crane/excavator work anchor, so its tire contact line crossed the building footprint.

Only fitout and final-testing trucks now park beside the completed hall. No changes to vehicle dimensions, hall dimensions, other machines, rules, or camera scale.

## Verification

- Fresh real 1280/1024 campaigns reach Install interiors by clicking actual build and permit/power controls.
- Each near-side tire contact projects to the side-service ground outside the hall wall, with an outer clearance limit too. Undo removes the queued truck.
- Old-anchor-only negative control fails this contact assertion.
- 792 unit tests, lint, source focused 2 tests, compiled desktop 55 tests pass.
- Inspected full day/night screenshots at 1280/1024 and enlarged actual 1280 day pixels: tires now stand on ground, not the wall. Actual six-hall journey still completes in the compiled regression suite.
- Production replay follows deployment.
