import campus from '../../assets/campus/campus-ground.svg';
import meadow from '../../assets/campus/campus-ground-meadow.svg';
import quarry from '../../assets/campus/campus-ground-quarry.svg';
import depot from '../../assets/campus/campus-ground-depot.svg';
import type {SiteMapTheme} from '../../content/schemas';

/** Terrain follows the authored site theme, not a guess from study times or prices. */
export function siteTerrain(theme:SiteMapTheme){
 if(theme.pond)return {id:'meadow',image:meadow};
 if(theme.ground==='#bcaaa4')return {id:'quarry',image:quarry};
 if(theme.ground==='#e0d2b0')return {id:'depot',image:depot};
 return {id:'campus',image:campus};
}
