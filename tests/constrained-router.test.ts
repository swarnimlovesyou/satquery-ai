import test from 'node:test';
import assert from 'node:assert/strict';
import {routeQuestion} from '../src/constrained/router';
test('questions preserve measured task and distinguish definitions from analysis',()=>{
 assert.equal(routeQuestion('Where is most of the change?','vegetation',true),'vegetation');
 assert.equal(routeQuestion('What does NDVI mean?','statistics',false),null);
 assert.equal(routeQuestion('What is the mean intensity?','statistics',false),'statistics');
 assert.equal(routeQuestion('What does this image show?','statistics',false),'statistics');
 assert.equal(routeQuestion('How much vegetation was lost?','statistics',false),'vegetation');
});
