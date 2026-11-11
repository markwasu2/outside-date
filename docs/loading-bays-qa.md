# Loading-bay detail

Closed loading doors now have ribbed panels, dark dock seals, overhead hoods, concrete loading aprons, bumpers, bollards and stand-clear stripes. They share the building camera and remain closed at every construction stage; the art does not imply delivery, occupancy or additional capacity.

Only the shell, fitout, testing and delivered hall illustrations change. A hall-only generator option keeps unrelated custom utility and office art from being overwritten during this pass.

Verification:
- 735 unit tests across 85 files pass.
- All 195 distinct browser cases pass, reconciled against the complete test list. The long month-review route ran separately.
- Twelve built-app journeys pass, including actual sale, two loss paths and day/night checks.
- Lint and production build pass; the existing large-chunk advisory remains.
- Actual 1280x720 built-app day and night pixels inspected after a full campus build. The doors and entrance remain distinct; controls, rent label, Money and sale route are readable.

No engine, finance, timeline or repository-visibility changes. Production deployment follows merge.
