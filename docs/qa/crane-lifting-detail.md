# Crane lifting detail

Frame-stage lifting cranes now have paired mast and jib chords with cross-bracing, side cab glass, counterweights, stabilizer supports and paired hoist lines with a hook block. The existing jib reach, asset footprint and movement are preserved.

## Verification

- All 754 unit, 254 browser and 27 built-app checks pass, plus lint/build.
- Asset regression verifies mast, jib, cab/stabilizers and hoist groups. The built construction replay checks those markers on the actual decoded crane while the frame order is active, then continues through frame completion.
- Inspected actual built frame-order day/night pixels and source staging-yard day/night pixels. Crane structure remains legible without obstructing building captions or controls.
- Full generation is byte-stable across all 34 assets. Only the crane asset changes from the prior generated output.
- Screenshots in `../screenshots/crane-lifting-detail/`. No costs, rules, timing, controls or reduced-motion behavior changes.
