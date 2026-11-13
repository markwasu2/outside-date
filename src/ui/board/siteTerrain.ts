import campus from '../../assets/campus/campus-ground.svg';
import meadow from '../../assets/campus/campus-ground-meadow.svg';
import quarry from '../../assets/campus/campus-ground-quarry.svg';
import depot from '../../assets/campus/campus-ground-depot.svg';
import campusFloor from '../../assets/campus/campus-floor.svg';
import meadowFloor from '../../assets/campus/campus-floor-meadow.svg';
import quarryFloor from '../../assets/campus/campus-floor-quarry.svg';
import depotFloor from '../../assets/campus/campus-floor-depot.svg';
import type {SiteMapTheme} from '../../content/schemas';

/** Terrain follows the authored site theme, not a guess from study times or prices. */
export function siteTerrain(theme:SiteMapTheme){
 if(theme.pond)return {id:'meadow',image:meadow,groundImage:meadowFloor};
 if(theme.ground==='#bcaaa4')return {id:'quarry',image:quarry,groundImage:quarryFloor};
 if(theme.ground==='#e0d2b0')return {id:'depot',image:depot,groundImage:depotFloor};
 return {id:'campus',image:campus,groundImage:campusFloor};
}
