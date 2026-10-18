import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ALICE='11111111-1111-4111-8111-111111111111';
const BOB='22222222-2222-4222-8222-222222222222';
const EMAIL='33333333-3333-4333-8333-333333333333';
let aliceNote, bobNote;
async function asUser(id,operation) {
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id || '']);
  try { return await operation(); }
  finally { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
}
before(async () => {
  // Minimal Supabase Auth fixture; the application migration is used unchanged.
  await db.exec(`create role anon noinherit; create role authenticated noinherit;
    create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,provider text,provider_id text,identity_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  const migration=await readFile(new URL('../supabase/migrations/001_guestbook.sql',import.meta.url),'utf8');
  await db.exec(migration);
  // A re-run must preserve existing schema and not create a second trigger.
  await db.exec(migration);
  for(const [id,provider,name,handle] of [[ALICE,'x','Alice','alice'],[BOB,'x','Bob','bob'],[EMAIL,'email','Email user','emailuser']]) {
    await db.query('insert into auth.users(id) values($1)',[id]);
    await db.query('insert into auth.identities(user_id,provider,provider_id,identity_data) values($1,$2,$3,$4)',[id,provider,handle,JSON.stringify({name,user_name:handle,avatar_url:'https://pbs.twimg.com/profile_images/1/test.jpg'})]);
  }
});
after(async()=>db.close());

test('anonymous visitors can read public notes, but cannot post', async()=>{
  await asUser(null,async()=>{
    assert.equal((await db.query('select * from public.wooflab_list_comments()')).rows.length,0);
    await assert.rejects(db.query("select public.wooflab_post_comment('Anonymous')"),/permission denied/);
    await assert.rejects(db.query('select * from wooflab_private.admins'),/permission denied/);
  });
});
test('an X identity can post, with the author selected by the database', async()=>{
  aliceNote=await asUser(ALICE,async()=>{
    const result=await db.query("select public.wooflab_post_comment('Hello Byte!') as id");
    const id=result.rows[0].id;
    const row=(await db.query('select * from public.wooflab_comments where id=$1',[id])).rows[0];
    assert.equal(row.author_id,ALICE); assert.equal(row.body,'Hello Byte!'); return id;
  });
  bobNote=await asUser(BOB,async()=>(await db.query("select public.wooflab_post_comment('A note from Bob') as id")).rows[0].id);
  await asUser(null,async()=>{ assert.equal((await db.query('select * from public.wooflab_list_comments()')).rows.length,2); });
});
test('a non-X account and direct client inserts cannot bypass the posting function',async()=>{
  await asUser(EMAIL,async()=>{ await assert.rejects(db.query("select public.wooflab_post_comment('Bypass')"),/x_identity_required/); });
  await asUser(ALICE,async()=>{
    await assert.rejects(db.query('insert into public.wooflab_comments(author_id,body) values($1,$2)',[BOB,'Forged author']),/permission denied/);
    await assert.rejects(db.query("update public.wooflab_profiles set display_name='Fake admin' where id=$1",[ALICE]),/permission denied/);
    await assert.rejects(db.query('insert into wooflab_private.admins values($1)',[ALICE]),/permission denied/);
  });
});
test('posting limits are server-enforced, including after deleting a note',async()=>{
  await asUser(ALICE,async()=>{
    await assert.rejects(db.query("select public.wooflab_post_comment('Too soon')"),/rate_limit/);
    assert.equal((await db.query('delete from public.wooflab_comments where id=$1 returning id',[aliceNote])).rows.length,1);
    await assert.rejects(db.query("select public.wooflab_post_comment('Still too soon')"),/rate_limit/);
  });
});
test('RLS blocks deleting another author’s note; an assigned admin can remove it',async()=>{
  await asUser(ALICE,async()=>{
    assert.equal((await db.query('delete from public.wooflab_comments where id=$1 returning id',[bobNote])).rows.length,0);
    assert.equal((await db.query('select public.wooflab_is_admin() as yes')).rows[0].yes,false);
  });
  await db.query('insert into wooflab_private.admins(user_id) values($1)',[ALICE]);
  await asUser(ALICE,async()=>{
    assert.equal((await db.query('select public.wooflab_is_admin() as yes')).rows[0].yes,true);
    assert.equal((await db.query('delete from public.wooflab_comments where id=$1 returning id',[bobNote])).rows.length,1);
  });
});
test('user-editable auth metadata cannot spoof the X profile',async()=>{
  await db.query("update auth.users set raw_user_meta_data=$1 where id=$2",[JSON.stringify({name:'FORGED',user_name:'admin',is_admin:true}),BOB]);
  const bob=(await db.query('select display_name,handle from public.wooflab_profiles where id=$1',[BOB])).rows[0];
  assert.deepEqual(bob,{display_name:'Bob',handle:'bob'});
  await asUser(BOB,async()=>{
    assert.equal((await db.query('select public.wooflab_is_admin() as yes')).rows[0].yes,false);
    await assert.rejects(db.query("select wooflab_private.sync_x_profile($1,'fake','{}')",[BOB]),/permission denied/);
  });
});
test('database validates length and whitespace even when the UI is bypassed',async()=>{
  await asUser(BOB,async()=>{
    await assert.rejects(db.query('select public.wooflab_post_comment($1)',['a'.repeat(1001)]),/comment_length/);
    await assert.rejects(db.query('select public.wooflab_post_comment($1)',[' \n\t ']),/comment_length/);
    await assert.rejects(db.query('select public.wooflab_post_comment(null)'),/comment_length/);
  });
});
test('keyset pagination has stable ordering and does not duplicate boundary notes',async()=>{
  await db.query("insert into public.wooflab_comments(author_id,body,created_at) select $1,'Note ' || n,'2026-10-01T10:00:00Z'::timestamptz from generate_series(1,8) n",[BOB]);
  await asUser(null,async()=>{
    const first=(await db.query('select * from public.wooflab_list_comments(null,null,3)')).rows;
    const last=first.at(-1);
    const second=(await db.query('select * from public.wooflab_list_comments($1,$2,3)',[last.created_at,last.id])).rows;
    assert.equal(first.length,3); assert.equal(second.length,3);
    assert.equal(new Set([...first,...second].map(row=>row.id)).size,6);
  });
});
test('deleting the Auth account cascades to public profiles and comments',async()=>{
  await db.query('delete from auth.users where id=$1',[BOB]);
  assert.equal((await db.query('select * from public.wooflab_profiles where id=$1',[BOB])).rows.length,0);
  assert.equal((await db.query('select * from public.wooflab_comments where author_id=$1',[BOB])).rows.length,0);
});
