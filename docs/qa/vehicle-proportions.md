# Vehicle proportions

The ground SVG stretches independently in X and Y to fill the desktop map. Vehicle bodies inherited that stretch: horizontal cars looked too narrow, vertical service trucks too short and wide. Body groups now use the scene's measured Y correction, preserving authored dimensions in pixels while centers, lanes, travel paths, timing and ground shadows remain unchanged. Headlights use the same correction as their vehicle so emitters meet the body edges. This covers ambient freight/car/site truck, parked cars and the campus service van. Isometric construction equipment images already preserve their own aspect ratio and are unchanged.

New desktop resize test requires equal screen-transform axis scales at 1280x720, 1440x900 and back. Built utility journeys require equal scales for parked cars and the service van and continue through sale. Inspected actual construction and finished campus day/night pixels. Bodies remain within their lanes and parking spaces; ground shadows remain flattened on the ground.

Verified764unit tests,265desktop browser tests,27built-app tests pluslint/build. Production replay follows merge.
