# Opening preview joins the one-ruler world scene

The title and setup preview still used the retired stretched ground picture
(campus-ground.svg at background-size 100% 100%) with sticker sprites on top: trees and
buildings warped with the window shape and sizes disagreed with the world view the game
actually plays in.

The preview now renders the same unbuilt-land world scene as the game (one ruler: a
standing person is 18 world units, road 44 wide, trees 68-80, pole 90) through
WorldCampusGround with a slice fit, and the interactive stickers (site office, field,
planned pads, power connection, cooling, your team) are resized to agree with it.
Click-to-edit hotspots, labels and wizard behavior are unchanged. No game rules touched.

Verified at 1280 and 1024: title and Walking the land pixel-inspected before/after.
792 unit, 65 compiled desktop checks, lint and build pass. Production check follows
deployment.
