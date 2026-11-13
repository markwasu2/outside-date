# Result-screen game name

Actual live liquid-cooled and six-hall campaign result pixels still used OUTSIDE DATE as the game name after the rest of the game became Data Center Simulator.

Changed only the simple win/loss summary's game-name line. Month, result values, game rules and the contract's outside-date term are unchanged.

Verification:
- 792 unit tests, lint and production build.
- Actual fresh default campaigns through sale at 1024 and 1280 assert the result name and no page overflow.
- Actual no-power loss through month 28 asserts the same result name and keeps loss guidance/restart checks.
- All 53 compiled desktop regression cases pass, including the six-hall sale.
- Restoring the old result label alone makes the fresh-sale name regression fail.
- Inspected compiled 1024 sale and 1280 no-power loss screenshots: new name fits; values, artwork and buttons remain readable.
- Production replay follows deployment.
