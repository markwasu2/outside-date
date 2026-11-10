# Map explanation CHECKPOINT

Personal Hard closing-wait replay expanded Why wait, then tried to open the site office as the explanation suggested. The explanation covered the office and intercepted its clicks. Toggling Why wait closed was required to recover.

| Gate | Result |
|---|---|
| Latest-main base | 73180224c25e944dd6cc2f78f70c4d7650416dc9 |
| Narrow fix | Read-only explanation passes pointer events through to the map |
| Contextual dismissal | Explanation closes when a map object opens |
| Unit suite | 589 passed |
| Browser suite | 127 passed, including both full click journeys and expanded explanation to office click regression |
| Lint / TypeScript / build | Passed; existing bundle-size warning remains |
| Pixels | Before click and office-open views inspected at 1280x720; explanation stays readable and office opens without a manual toggle |
| Engine / bots / tuning | Unchanged; no seed grid required |
| Save schema | Unchanged; no migration required |
| Deployment | Verify live build and replay after merge |

Screenshots: `docs/screenshots/cold2/map-explanation-before-click.png` and `map-explanation-office-open.png`.
