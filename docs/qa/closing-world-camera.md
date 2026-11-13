# Closing world camera

The final campus illustration uses the same isometric axes, physical hall spacing and sprite anchor as the live multi-hall campus. A compact 3:2 crop replaces disconnected hall thumbnails on a mismatched rectangular road image. Hall IDs sit above the buildings; exact stages and tenant departures stay in a separate legible list. No changes to outcomes, game rules, money or live-map controls.

The still preserves unstarted plots, partial stage progress and terminated building opacity. Working vehicles and active-work effects are disabled at close. Power art appears only when the substation is done. Internal roads appear only after land ownership. Terrain colors follow the scenario-resolved site theme. The illustration is a simplified closing view, not a full inventory of the landscaping and utilities.

## Verification

- 774 unit tests and lint pass. Two new tests check sprite proportions, bounds, live row/column arrangement, inter-hall offsets and upright/ground axes for one through six halls.
- All 285 source-browser cases exercised through shards and targeted reruns. The detailed month-review journey hit its55-second budget once under concurrent load and passed alone in33.5seconds; no assertion failure or application exception was observed.
- All33 compiled-app cases pass, including real single/four/six-hall sales and missed-power/delayed-cash losses.
- New1024/1280desktop matrix checks one through six halls with mixed final states, no working vehicles, legible stage/tenant text, fixed art proportions, bounded hall footprints and visible restart controls.
- Actual pixels inspected: real single/six-hall sale, mixed six-hall1024close, empty-site and partial-build losses. Final published replay remains required after deployment.
