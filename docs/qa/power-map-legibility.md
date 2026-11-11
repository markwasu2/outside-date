# Power map legibility

In simple mode the Power button now labels the object without a second heading over the image. Its state sits below the control and the larger image sits above it. Detailed-mode layout is unchanged. Inspected actual built opening, study, energized and night scenes at desktop sizes.

Verified 710 unit tests, 180 browser cases, four built-app checks and lint/build. Built sale journeys assert the energized state sits below the Power control.

The full pass exposed a stale fast-forward test: it clicked the header Run/Pause sim toggle repeatedly, often cancelling the initial 250ms timer before a month could advance. The test now opens Postures and uses the actual one-shot Skip to next milestone control. Both event/fast-forward tests passed five repeat runs, followed by the complete 45-case shard. No engine or timed-sim code changed.
