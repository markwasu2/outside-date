# Simulation pause/resume clock

Rapid pause/resume could revive a callback from the previous run. It then joined the new run's timer, advancing a month before the new run's initial delay and potentially maintaining two clocks.

Each Run/Pause change now invalidates callbacks from older runs. Only the current run's callbacks may advance time. Pause, event guards and the existing 250ms initial / 800ms subsequent delays are otherwise unchanged. No engine rules changed.

Verified 719 unit tests, 183 browser cases, six built-app checks and lint/build. Controlled-clock unit tests reproduce pause/resume and new-game/resume races. A real-click browser journey confirms time stays still until the resumed clock is due and remains still after Pause. Inspected its actual paused-state rendering.
