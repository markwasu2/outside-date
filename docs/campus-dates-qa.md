# Consistent campus dates

A full Custom campus route exposed two remaining clock problems: closing showed year/month codes before switching to plain month numbers during play, and a power connection still being built displayed Done beside its scheduled date.

Simple closing and map schedule dates now use the campus month clock. Pending power completion says Due, not Done. Detailed mode keeps year/month dates, with the same honest Due wording. No schedule or engine changes.

Verification:
- 736 unit tests across 86 files pass.
- All 196 distinct browser cases pass, reconciled against the complete list. Month-review ran separately. The detailed substation test was updated from the old Done wording to Due and rerun successfully.
- Thirteen built-app journeys pass, including the new actual Custom campus route through all setup choices, closing, building, contacts, power, Money and sale. It checks closing month 23/cutoff month 31 and a scheduled power Due month label while the connection is still building.
- Lint and production build pass. Existing large-chunk advisory remains.
- Actual 1280x720 built pixels inspected for the closing table and pending power date. Dates, controls and the monthly receipt remain readable.

No costs, deadlines, random outcomes, permission or repository-visibility changes.
