# Power reserve tree clearance

Two right-edge tree roots occupied the power-plant reserve pad. In the three-hall synthetic finished-campus view, one trunk grew directly through plant A's equipment pad. The shared camera now starts this tree row at world y=10, beyond both the reserved pad and its equipment. Building, vehicle and worker sizes are unchanged.

Perimeter root positions now live in worldCampusLayout alongside the pad geometry. Six unit cases check counts 1 through 6 against the reserved rectangle. The browser regression inverts the projected root coordinates so a root hidden behind the HTML equipment layer still fails. Temporarily restoring the old row made the three-hall browser case fail on the occupied pad.

The source-free saved-state fixture deliberately enables plants and uses one building and one online plant. It checks day/night, decoded images and the clickable power panel at 1024/1280 desktop widths for one, three and six halls. This is synthetic camera coverage, not evidence that a player opened six halls in month 1.

Validation: 786 unit tests, 12 focused source-browser cases, lint/build. Compiled-app checks and production replay are recorded separately in the work report. Before/after three-hall and compact six-hall night pixels are in ../screenshots/power-reserve. No game rules, money, repository visibility or other project changes.
