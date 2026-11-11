# Unfinished milestone navigation - desktop

Every construction milestone previously opened H1. In a multi-hall campus, that sends the player back to a completed foundation or an already open building instead of the hall that still needs the selected stage.

Unfinished milestones now select the first live hall still missing that stage. Ended halls remain inspectable after live unfinished work. Completed milestones retain the original first-hall inspection. Completion counts and engine rules are unchanged.

Verification:
- Focused two-hall fixture: H1 delivered, H2 awaiting frame. Frame and Open now open H2. The same click assertion fails against the prior code and passes after the fix.
- Actual four-hall Whale campaign using real orders and month advances: finish H1 foundation, click unfinished Foundation, inspect and build H2. No save injection for this route.
- Inspected the real four-hall panel screenshot at 1280x720. Header, Close, explanation and build action are visible.
- 741 unit tests, all 202 distinct browser tests, eighteen built desktop journeys, lint and production build pass. Browser identities reconciled against full listing.
- Production replay follows deployment.

Evidence: `docs/screenshots/milestone-target/real-four-hall.png`.
