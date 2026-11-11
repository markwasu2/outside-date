# Keep the win visible in a mixed month

A setback previously occupied the entire monthly summary, hiding completed milestones from that strip. It now stays first while an 'Also completed' line names milestones recorded in the same frozen month. The warning remains visually primary, without the achievement animation.

The rendering check uses a mixed-month fixture, verifies the warning and foundation completion both remain visible, keeps Next month on screen, and confirms opening a new control does not rewrite finished results. Inspected the actual 1280px fixture screenshot. The engine and sound behavior are unchanged.

Verification: 180 browser tests, 710 unit tests, four built-app checks, lint/build.
