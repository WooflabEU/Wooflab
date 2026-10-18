import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusTimer, formatTime, fetchIdea, ideas } from '../src/lib/experiments.js';
import { validatePublicConfig, safeAvatarUrl, safeXProfileUrl, validateComment } from '../src/lib/validation.js';

test('focus timer accounts for sleeping/background tabs without losing elapsed time', () => {
  let clock = 10_000;
  const timer = createFocusTimer(25, () => clock);
  timer.start(); clock += 11 * 60_000;
  assert.equal(timer.snapshot().seconds, 14 * 60);
  clock += 20 * 60_000;
  assert.deepEqual({seconds:timer.snapshot().seconds,done:timer.snapshot().completed,running:timer.snapshot().running}, {seconds:0,done:true,running:false});
  timer.start(); assert.equal(timer.snapshot().seconds,25*60);
});
test('paused timer does not count idle time and duration changes stop the previous sprint', () => {
  let clock = 0; const timer = createFocusTimer(5, () => clock);
  timer.start(); clock = 45_250; timer.pause(); clock += 100_000;
  assert.equal(timer.snapshot().seconds,255);
  timer.start(); clock += 10_000; assert.equal(timer.snapshot().seconds,245);
  timer.reset(15); assert.equal(timer.snapshot().seconds,900); assert.equal(timer.snapshot().running,false);
  assert.equal(formatTime(245),'04:05');
});
test('idea fetching keeps categories separate and avoids immediate repeats', () => {
  for(const category of Object.keys(ideas)) {
    const first=fetchIdea(category,'',()=>0);
    const second=fetchIdea(category,first,()=>0);
    assert.notEqual(first,second); assert.ok(ideas[category].includes(second));
  }
});
test('configuration rejects secret keys and credential-bearing or non-Supabase URLs', () => {
  assert.equal(validatePublicConfig({}).configured,false);
  assert.equal(validatePublicConfig({supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'sb_publishable_example'}).configured,true);
  assert.throws(()=>validatePublicConfig({supabasePublishableKey:'sb_secret_keep_private'}));
  const serviceJwt=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.signature`;
  assert.throws(()=>validatePublicConfig({supabasePublishableKey:serviceJwt}));
  assert.throws(()=>validatePublicConfig({supabaseUrl:'https://attacker.example'}));
  assert.throws(()=>validatePublicConfig({supabaseUrl:'https://password@project.supabase.co'}));
});
test('profile links and avatars cannot become script URLs or arbitrary tracking endpoints', () => {
  assert.equal(safeAvatarUrl('javascript:alert(1)'),null);
  assert.equal(safeAvatarUrl('https://pbs.twimg.com.evil.example/image.png'),null);
  assert.equal(safeAvatarUrl('http://pbs.twimg.com/image.png'),null);
  assert.equal(safeAvatarUrl('https://pbs.twimg.com/profile_images/1/a.jpg'),'https://pbs.twimg.com/profile_images/1/a.jpg');
  assert.equal(safeXProfileUrl('Byte_123'),'https://x.com/Byte_123');
  assert.equal(safeXProfileUrl('evil/x?'),null);
  assert.equal(safeXProfileUrl('x'.repeat(16)),null);
});
test('comment validation handles whitespace and Unicode without altering the content', () => {
  assert.ok(validateComment(' \n\t ').error);
  assert.ok(validateComment('a'.repeat(1001)).error);
  assert.equal(validateComment('🐾'.repeat(1000)).content.length,2000);
  assert.equal(validateComment(' <script>alert(1)</script> ').content,'<script>alert(1)</script>');
});
