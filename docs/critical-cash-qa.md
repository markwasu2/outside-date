# Critical cash in the simple campus

A complete delayed-start route bought land and arranged permits/power but deferred the foundation until month 15. It built through walls and started interiors, paid repeated inspection repairs, and ran out of cash in month 23. The campus still showed $28.5M of unused build commitments. The existing critical-runway warning was available in detailed alerts, while simple mode only showed an alert count on Last month.

Simple mode now displays the shared under-three-month cash threshold directly on the campus, with stronger wording below one month and a direct link to Money's current position. It uses the existing runway selector and excludes incoming funds until cash actually arrives. It is explicitly a current-recurring-net-cost estimate, not a promise about future construction, purchases or setbacks. The build budget is identified as separate from bill cash.

This does not pause time, take a finance action, change costs, or change the loss. The repair instruction and Next month remain visible. The warning clears when actual cash rises above the threshold. Ordinary well-funded openings have no extra banner.

Verification:
- 727 unit tests across 83 files.
- 193 distinct browser cases pass. The slow month-review journey ran separately to keep each runner within its time limit; the run was reconciled against the complete test list.
- Ten built-app journeys pass, including the complete delayed-build warning/Money/loss route.
- Lint and production build pass; the existing large-chunk advisory remains.
- Actual 1280x720 pixels inspected for warning with paused construction and for the Money panel. Footer and Next month remain in view.
- Additional live-position test verifies a quiet opening, under-three-month warning, direct Money navigation, then warning removal after actual cash changes.

No engine, spending, timeline or repository-visibility changes.
