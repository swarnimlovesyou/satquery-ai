import {test} from 'node:test';
import assert from 'node:assert/strict';
import {routeQuery} from '../src/router.ts';

test('routes the supported natural-language intents deterministically',()=>{
 assert.equal(routeQuery('Identify newly flooded regions and estimate the affected area.',true),'flood');
 assert.equal(routeQuery('Show vegetation-rich regions.',false),'vegetation');
 assert.equal(routeQuery('What changed between these two images?',true),'change');
 assert.equal(routeQuery('Highlight built-up areas.',true),'urban');
 assert.equal(routeQuery('Identify water bodies.',false),'water');
});

test('rejects unsupported, empty, ambiguous and missing-pair requests',()=>{
 assert.throws(()=>routeQuery('',true),/Enter a question/);
 assert.throws(()=>routeQuery('What is the population?',true),/prototype supports/);
 assert.throws(()=>routeQuery('Show buildings and water',true),/one land-cover type/);
 assert.throws(()=>routeQuery('What changed?',false),/needs Image B/);
});
