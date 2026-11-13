# Small-campus utility perimeter

Local candidate after PR290. Two- and three-hall layouts still had a shallow 150-unit perimeter while the backup/support yard was anchored at y175 with an apron ending at y265. Their utility equipment and tree border crossed the road. Give every campus enough depth for the utility apron: max(275, rows*180-30). Fixed physical art dimensions are unchanged; only the lot, road and camera bounds extend. Single-hall and four-to-six-hall dimensions remain unchanged.

Inspected actual two/three-hall construction fixture pixels. Both equipment pads now lie within the roads, rather than through the tree border. Construction leaves a large southern reserve court; do not claim finished art or add scenery solely to fill it.

Verification: 780 unit cases, 20 focused source-browser cases, all 37 compiled-app cases, lint/build pass. Completed two/three-hall fixtures at 1024/1280 day/night visually inspected, with rent inspection still reachable. These are synthetic state fixtures, not claimed real two/three-hall full journeys. Real single/four/six-hall sale journeys remain in the compiled regression suite. Production replay follows deployment.
