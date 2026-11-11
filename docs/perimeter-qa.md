# Site boundary art pass

Buying land now adds a physical construction boundary around the campus instead of a faint outline. Panels, posts, caps and outward shadows define the owned site. A parked sliding gate and clear access gap leave the service entrance open. Once interiors are reached, the panels become lighter mesh and rails; night view dims the boundary and lights the gate posts.

This is scenery included in the campus build. No upgrade action, extra cost, security benefit, capacity or construction progress is implied. Undoing land purchase removes it immediately. The simple-mode compound is the only changed scene; detailed-mode map art is untouched.

Verification:
- 721 unit tests across 82 files.
- 190 browser cases, all pass (48 + 48 + 47 + 47).
- Eight built-app journeys, including completed day/night campuses at 1280 and 1440.
- Lint and build pass; existing large-chunk advisory remains.
- Inspected actual early-owned and completed campus pixels at 1280x720, both day and night.
- Real-click ownership/undo check preserves action-point count and removes/re-adds boundary; completed full journeys assert the finished perimeter and service gate.

No engine, pricing, timeline or repository-visibility changes.
