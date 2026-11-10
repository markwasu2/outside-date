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
