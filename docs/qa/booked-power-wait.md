# Booked power-wait feedback

The simple-view footer used to say that waiting would not order missing equipment even when the player had already ordered it. In an actual four-hall Whale replay, the transformer was booked for month 42, but the footer asked the player to inspect the connection for missing orders.

The footer now separates missing study/equipment, pending study/equipment dates, automatic connection construction, scheduled plant capacity, and a fully online but undersized supply. Dates use the current schedule rather than the original planned date. An unpaid due equipment balance points to Money without claiming that every due crate is unpaid. Waived transformers are not requested. Capacity-ready automatic hookups retain their existing instruction.

Verified locally: 747 unit tests, 215 desktop browser tests, 25 built-app tests, lint and build. The real simple Whale replay still sells all four halls in month 50 at 0.98x. No engine or power rules changed.

Inspected 1280x720 screenshots:
- ../screenshots/power-wait/real-whale-transformer.png
- ../screenshots/power-wait/scheduled-plant.png

The plant paragraph and actual four-hall transformer paragraph fit above the month controls without text overlap. Browser fixtures cover missing gear, ordered gear, automatic construction and delayed plant dates; unit fixtures cover due balances, waived gear, unapproved plants and exhausted capacity.
