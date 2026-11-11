import {describe,it,expect} from 'vitest';
import {loadContent} from '../../src/content/load';
import {createGame} from '../../src/engine/init';
import {DEFAULT_SETUP,DEFAULT_NEGOTIATION} from '../../src/ui/defaultGame';
import {contactPurpose,relevantContactGroups} from '../../src/ui/board/relationships';
const content=loadContent();const fresh=()=>createGame(content,'tutorial-edge5',DEFAULT_SETUP,DEFAULT_NEGOTIATION,1);
describe('contact stakes',()=>{
 it('prioritizes a tenant takeout benefit after delivery, not the lowest irrelevant utility score',()=>{
  const s=fresh();s.halls[0]!.delivered=true;s.goodwill.utility=0;s.goodwill.town=20;
  expect(relevantContactGroups(s,content)[0]).toBe('tenant');expect(contactPurpose(s,content,'tenant')).toContain('20.0 → 20.4');
  s.flags['visitCastLast:tenant']=s.month;expect(relevantContactGroups(s,content)).not.toContain('tenant');expect(relevantContactGroups(s,content)).not.toContain('utility');
 });
 it('shows actual community grade thresholds and does not promise rent or deadline recovery',()=>{
  const s=fresh();s.halls[0]!.delivered=true;s.goodwill.town=58;s.goodwill.commission=58;
  expect(contactPurpose(s,content,'town')).toContain('grade C → B');expect(contactPurpose(s,content,'town')).toContain('does not change the delivery grade');
  s.goodwill.tenant=100;expect(contactPurpose(s,content,'tenant')).toContain('capped');expect(contactPurpose(s,content,'utility')).toContain('no remaining plant online check');
 });
});
