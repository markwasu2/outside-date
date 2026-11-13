# Undo acknowledgement

Actual first-campus play exposed a stale checkmarked acknowledgement after undoing a foundation order while an earlier land order remained. The build control and footer correctly reverted, but the receipt still claimed foundation had been ordered.

Clear the receipt on any decrease in queued order count. No game rules or physical object placement changed.

Verified at 1280x720 and 1024x720: land, foundation, undo foundation, reorder, undo foundation again, undo land. Receipt clears, original controls return. Negative control restoring old feedback source fails at both widths after a one-second wait. Corrected pixels inspected.

792 unit tests, 63 compiled desktop checks, lint and build pass. Production verification follows deployment.
