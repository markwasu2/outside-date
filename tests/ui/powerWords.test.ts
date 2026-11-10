import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {canConnectOnNextTick,plantWords,substationWords} from '../../src/ui/board/powerWords';
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


it('previews ordered allocation without promising the same spare MW to two waiting halls', () => {
 const c=loadContent(),s=createGame(c,'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 s.power.substationStatus='done'; s.power.plants.forEach(p=>p.onlineMonth=null);
 s.power.interimGridMW=30;
 expect(canConnectOnNextTick(s,c,'H1')).toBe(true);
 expect(canConnectOnNextTick(s,c,'H2')).toBe(false);
 s.power.interimGridMW=29;
 expect(canConnectOnNextTick(s,c,'H1')).toBe(false);
 s.power.interimGridMW=60;
 expect(canConnectOnNextTick(s,c,'H2')).toBe(true);
 s.halls[0]!.energized=true;
 expect(canConnectOnNextTick(s,c,'H1')).toBe(false);
 expect(canConnectOnNextTick(s,c,'H2')).toBe(true);
});

it('uses resolved scenario cooling for the next hookup preview',()=>{
 const c=loadContent(),s=createGame(c,'millbrook-relay',{...DEFAULT_SETUP,hallTier:'hybrid',cooling:'hybrid'},DEFAULT_NEGOTIATION,1);
 s.power.substationStatus='done';s.power.interimGridMW=25;s.power.plants.forEach(p=>p.onlineMonth=null);
 expect(canConnectOnNextTick(s,c,'H1')).toBe(true);
 s.power.interimGridMW=24;expect(canConnectOnNextTick(s,c,'H1')).toBe(false);
});
