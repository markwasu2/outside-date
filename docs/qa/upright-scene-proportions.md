# Upright people and grounded crew

A desktop scene stretches the ground's 1200x800 projection to the available map rectangle. That also flattened worker and visitor bodies, especially after the month receipt made the map shallower. The map now measures its actual rendered dimensions and corrects only upright people for this unequal scale. Feet remain the local transform anchor. Moving paths, ground routes and shadows retain their scene locations. Figure scale is 0.8 before the correction, with narrower hard hats and torsos.

The contacts crew is reduced from 125px to an 80px illustration within the original click target. Its raised display plinth and whole-group floating shadow are removed; each figure has a small foot-contact shadow. Feet stay near their former map position, and the contacts label/click area is unchanged. These figures are now closer in size to the other on-site people and building doors.

Focused regression measures the actual SVG screen transforms at 1280x720 and 1440x900 and after resizing back, requiring equal horizontal and vertical scale. It also checks the crew image and opens the contacts panel. Both built utility journeys require upright courtyard visitors and finish through sale. Inspected real built day/night and working scene pixels. This fixes a specific distortion and oversized crew, not every scale issue in the scene. Building/equipment/vehicle scale remains for later audit.

All 763 unit, 262 browser and 27 built cases pass, plus lint/build. All 34 assets regenerate identically. Haul-surface texture experiment is parked on an unshipped branch, not part of this change.
