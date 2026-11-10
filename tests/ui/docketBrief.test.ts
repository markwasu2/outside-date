import {it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {docketOdds} from '../../src/ui/board/DocketBrief';
it('displays exact vote components and clamps without mutating',()=>{
 const c=loadContent();const s=createGame(c,'whale',{site:'megasite',hallTier:'air',cooling:'evaporative',gc:'costPlus'},{lease:{firstDeliveryMonth:38,lateRemedy:'liquidatedDamages'},capital:{seniorIndex:1,mezzIndex:1,playerShareIndex:1},power:{minCharge:'medium',plantBOffset:0},insurance:{dsu:false}},1);
 const before=JSON.stringify(s);expect(docketOdds(s,c).chance).toBe(c.tuning.docket.voteBase);expect(JSON.stringify(s)).toBe(before);
 s.docket.testimonyBonus=1;s.goodwill.commission=100;expect(docketOdds(s,c).chance).toBe(c.tuning.docket.maxOdds);
});
