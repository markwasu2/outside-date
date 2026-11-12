# Preserve frame bracing source

The steel-frame bracing group now has its editable fragment at `scripts/campus-details/hall-steel.svg`. The existing source-fragment test includes it, so it must occur exactly once in the generated asset.

Verification: all 747 unit checks, lint and build pass. Generated all seven hall assets in a clean temporary directory and compared each to the checked-in asset byte-for-byte; all matched. This source-only change has no game output or visual change. The built and production frame day/night inspections are recorded under steel-frame-bracing.
