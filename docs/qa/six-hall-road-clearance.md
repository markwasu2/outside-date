# Expanded campus road clearance

An actual simple-view Whale campaign accepted both expansion halls and sold all six in month 60 at 1.92x. During that replay the service road covered the third building column and lower-row rent labels. This was an art/layout issue, not missing construction.

Simple-view campuses with more than four halls now keep their three-column building area inside the service roads. The hall layer protects the rent labels from the entry gate. Idle controls become small Inspect buttons rather than wide rows covering the artwork; delivered buildings omit the redundant disabled button but remain clickable and keyboard-accessible through the hall itself. Real build orders keep a named action button and cost. One-to-four-hall and detailed layouts are unchanged.

Verified:
- Actual six-hall expansion through real UI choices and construction orders to sale, with no state injection. The permanent built replay checks road clearance throughout the expanded campaign and verifies all six halls opened.
- Five- and six-hall fixtures at 1280x720 and 1440x900. Checked map bounds, opened an operating building, placed a frame order, and inspected active work.
- Actual month-49 and sale screenshots inspected; the third-column buildings and all operating rent labels are readable. Wide desktop fixture inspected too.
- 747 unit tests, all 223 desktop browser tests, all 26 built-app tests, lint and build pass.

Evidence: ../screenshots/expansion-clearance/ . Production replay follows deployment. No gameplay, financing, or power rules changed.
