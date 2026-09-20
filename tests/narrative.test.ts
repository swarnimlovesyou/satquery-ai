import test from 'node:test';import assert from 'node:assert/strict';import {narrative} from '../src/constrained/narrative';
test('plain-language summaries use measured values without calling generic change flooding',()=>{
 assert.match(narrative({task:'change',coverage:52.2}),/52.2%/);
 assert.match(narrative({task:'change',coverage:52.2}),/does not by itself identify flooding/);
 const s={task:'water',method:'NDWI',mode:'bitemporal',beforeCoverage:10,afterCoverage:25,netPercentagePoints:15,lostCoverage:2,gainedCoverage:17};
 assert.match(narrative(s),/10% before and 25% after/);assert.match(narrative(s),/15 percentage points/);
 assert.match(narrative({...s,task:'water',mode:'single',method:'RGB heuristic',coverage:30}),/colour-based estimate/);
});
