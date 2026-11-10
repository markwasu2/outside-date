import {expect,it} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {permitReviewWords} from '../../src/ui/board/permitWords';
it('explains each live permit state and the actual pending decision month',()=>{
 const s=createGame(loadContent(),'whale',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
 s.permitsRequired=['building'];
 expect(permitReviewWords(s).join(' ')).toContain('not filed');
 s.permits.building.status='pending';s.permits.building.decisionMonth=7;
 expect(permitReviewWords(s).join(' ')).toContain('Decision due Y1 M8');
 s.month=7;expect(permitReviewWords(s).join(' ')).toContain('due this month');
 s.permits.building.decisionMonth=null;expect(permitReviewWords(s).join(' ')).toContain('not scheduled');
 s.permits.building.status='denied';expect(permitReviewWords(s).join(' ')).toContain('File again');
 s.permits.building.status='granted';expect(permitReviewWords(s).join(' ')).toContain('building permit: granted');
});
