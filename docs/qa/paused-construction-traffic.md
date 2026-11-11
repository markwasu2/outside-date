# Paused construction traffic

Construction service traffic now uses the same live-work check as the construction workers and equipment. It stops when work is unfunded, frozen, paused for the month or blocked by an inspection, and returns when work can resume. Public-road traffic remains scenery and continues. If another hall can still work, construction activity remains.

The shared check is read-only and uses the existing exact-funding probe. No engine, funding or schedule changes.

Verified 712 unit tests, 180 browser cases, four built-app checks and lint/build. The inspection-repair and unfunded-work fixtures explicitly check service traffic and public-road traffic. Inspected both stopped and repaired fixture scenes.
