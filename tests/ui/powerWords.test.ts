import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {plantWords,substationWords} from '../../src/ui/board/powerWords';
it('explains automatic construction and never asks an approved docket to pass again',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1),p=s.power.plants[0]!;
 expect(plantWords(p,s)).toContain('waiting for');s.docket.status='approved';expect(plantWords(p,s)).toContain('starts automatically next month');
 expect(substationWords(s)).toContain('No separate build instruction');s.power.substationStatus='building';s.power.substationDoneMonth=8;expect(substationWords(s)).toContain('due Y1 M9');
 s.power.substationStatus='done';expect(substationWords(s)).toContain('energized');
 s.docketEnabled=false;expect(plantWords(p,s)).toContain('Local grid supply');
});

it('names the remaining capacity gap and scheduled source without promising delivery',async()=>{
 const {powerCapacityWords}=await import('../../src/ui/board/powerWords');
 const c=loadContent(),s=createGame(c,'millbrook-relay',{...DEFAULT_SETUP,hallTier:'hybrid',cooling:'hybrid'},DEFAULT_NEGOTIATION,1);
 s.power.substationStatus='done';s.power.interimGridMW=12;s.power.plants[0]!.plannedOnlineMonth=29;
 const text=powerCapacityWords(s,c);expect(text).toContain('12.0 MW available');expect(text).toContain('H1 needs 25.0 MW');expect(text).toContain('Plant A, Y3 M6');expect(text).toContain('can slip');
 s.halls[0]!.energized=true;expect(powerCapacityWords(s,c)).toContain('25.0 MW committed');
});
