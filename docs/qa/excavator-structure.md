# Excavator structure

The foundation excavator now has continuous crawler tracks, cab side glass and rails, engine vents, hydraulic cylinders and piston rods. The former solid rectangular bucket is replaced by an open digging bucket with side plates, a cutting edge and teeth. Existing footprint, arm reach, movement and stage behavior are unchanged.

## Verification

- All 753 unit, 254 browser and 27 built-app checks pass, plus lint/build.
- The asset regression checks the track, cab/hydraulic and bucket geometry groups. The built foundation replay decodes the actual excavator asset and checks all three markers before advancing construction.
- Inspected built foundation day/night pixels and source staging-yard pixels. Tracks and the bucket read as construction machinery at actual game size; no caption or control obstruction.
- Full generation is byte-stable across all 34 assets. Only the excavator asset changes from the prior generator output.
- Screenshots in `../screenshots/excavator-structure/`. No costs, rules, timing, controls or reduced-motion behavior change.
