# Hall placard empty hit area

A real1024x640 production replay stopped after Build frame because the hall's invisible160px placard container covered the Power button center. The visible Inspect building work button did not overlap Power. This reproduced twice and was confirmed through actual pointer hit testing.

The placard now ignores pointer events in its unused area. Its buttons explicitly retain pointer events. No movement, resizing, camera, game-rule or visual-art changes.

## Verification

- Actual1280x640 and1024x640 fresh campaigns complete sale, including Power, hall actions, rent explanation, money, zoom, scroll and night controls.
- Old-hitbox-only negative control fails the Power click at1024.
- 792unit tests, lint/build,2focused source and57compiled desktop checks pass.
- Inspected1024x640 actual sale-ready and night courtyard frames. All expected controls remain visible and the map stays inside its frame.
- Production replay follows deployment.
