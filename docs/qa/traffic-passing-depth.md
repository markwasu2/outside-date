# Passing traffic depth

Production review found the far-lane car painted on top of the nearer freight cab as they passed. This made its wheel appear embedded in the cab. At SVG time37s, the issue is visible on the actual first-campus construction journey.

Paint the far lane before the near lane. Vehicle geometry, lane paths, timing, game costs and rules are unchanged.

## Verification

- Actual first-campus land, permit and foundation orders at1280x720 and1024x720.
- Sampled traffic at7s and37s, north/south camera positions, day/night and reduced motion.
- Inspected passing detail and full desktop pixels before/after.
- Regression checks lane paint order and reduced-motion behavior.
- Negative control restoring only the previous source fails the paint-order assertion.
-792unit tests;61compiled desktop checks; lint and build pass.
- Production replay follows deployment.

Evidence: `docs/screenshots/traffic-passing-depth/`.
