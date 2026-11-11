# Simple-view power yard spacing - desktop

The four-hall replay exposed overlapping labels: the substation state is below its Power button, while the Power plants heading started immediately in the next grid row. The overlap reproduced at 1280x720 and 1440x900.

Added top space inside the simple-view plant yard so its heading starts below the connection state. The detailed view is unchanged. No engine, financing or power rules changed.

Verification:
- Actual new Whale campaigns, switching to simple view, buying no land and commissioning a real power study. Checked not-started, study-pending and next-month states at both desktop sizes.
- The new spacing checks failed against the prior layout at both sizes and passed after the change. The title now clears the connection state by at least eight pixels.
- Inspected the pending-study screenshots at both sizes.
- All 739 unit tests, 200 distinct browser tests, seventeen built journeys, lint and production build pass. Browser test identities reconciled against the complete listing.
- Production replay follows deployment.

Evidence: `docs/screenshots/power-yard/`.
