import test from 'node:test';
import assert from 'node:assert/strict';
import { facingForInput } from '../.test-build/core/facing.js';

test('all four diagonal inputs select the corresponding isometric facing',()=>{
  for(const [x,y,expected] of [[1,-1,'north-east'],[-1,-1,'north-west'],[1,1,'south-east'],[-1,1,'south-west']])
    assert.equal(facingForInput({x,y},'east'),expected);
});
test('north and south face away or toward camera while retaining the horizontal side',()=>{
  assert.equal(facingForInput({x:0,y:-1},'east'),'north-east');
  assert.equal(facingForInput({x:0,y:1},'north-east'),'south-east');
  assert.equal(facingForInput({x:0,y:-1},'south-west'),'north-west');
  assert.equal(facingForInput({x:0,y:1},'west'),'south-west');
});
test('releasing movement preserves each last facing for its idle pose',()=>{
  for(const facing of ['east','west','north-east','north-west','south-east','south-west'])
    assert.equal(facingForInput({x:0,y:0},facing),facing);
});
test('horizontal movement still selects the original left/right art',()=>{
  assert.equal(facingForInput({x:1,y:0},'north-west'),'east');
  assert.equal(facingForInput({x:-1,y:0},'south-east'),'west');
});
