import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { validatePublicConfig } from '../src/lib/validation.js';

const root = resolve(import.meta.dirname,'..');
const dist = join(root,'dist');
const required = ['index.html','guestbook/index.html','privacy/index.html','terms/index.html','auth/callback/index.html','404.html'];
const html = new Map();
let sharedStylesheet;
for (const name of required) {
  const source = await readFile(join(dist,name),'utf8');
  assert.ok(!source.includes('partial:'),`${name}: unresolved template`);
  assert.equal((source.match(/<h1[\s>]/g)||[]).length,1,`${name}: expected one main heading`);
  assert.ok(source.includes('id="main"'),`${name}: missing main anchor`);
  assert.ok(source.includes('lang="en"'),`${name}: missing document language`);
  assert.ok(source.includes('name="viewport"'),`${name}: missing viewport`);
  assert.ok(source.includes('name="theme-color" content="#171813"'),`${name}: inconsistent browser theme color`);
  const css=[...source.matchAll(/<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(css.length,1,`${name}: expected the shared global stylesheet`);
  if (!sharedStylesheet) sharedStylesheet=css[0];
  assert.equal(css[0],sharedStylesheet,`${name}: secondary page does not use the global theme`);
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(ids.length,new Set(ids).size,`${name}: duplicate IDs`);
  html.set(name,source);
}
for (const [name,source] of html) {
  const links = [...source.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(match=>match[1]);
  for (const target of links) {
    assert.ok(!target.startsWith('javascript:'),`${name}: unsafe URL`);
    if (/^(?:https?:|mailto:|data:)/.test(target)) continue;
    const [path,anchor] = target.split('#');
    const local = path ? path.replace(/^\//,'') : name;
    const file = path && (path === '/' || path.endsWith('/')) ? `${local}index.html` : local;
    const safeFile=resolve(dist,file || 'index.html');
    assert.ok(safeFile.startsWith(`${dist}/`),`${name}: invalid local path`);
    await stat(safeFile).catch(()=>{throw new Error(`${name}: missing ${target}`);});
    if (anchor && file.endsWith('.html')) {
      const contents = html.get(file) || await readFile(safeFile,'utf8');
      assert.ok(contents.includes(`id="${anchor}"`),`${name}: missing anchor ${target}`);
    }
  }
  for (const [,srcset] of source.matchAll(/\bsrcset="([^"]+)"/g)) {
    for(const part of srcset.split(',')) await stat(join(dist,part.trim().split(/\s+/)[0]));
  }
}
for (const folder of ['public','dist']) validatePublicConfig(JSON.parse(await readFile(join(root,folder,'site-config.json'),'utf8')));
const headers=await readFile(join(dist,'_headers'),'utf8');
assert.ok(headers.includes("script-src 'self'"));
assert.ok(headers.includes('Cache-Control: no-store'));
const guestbook=await readFile(join(root,'src/guestbook.js'),'utf8');
assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML/.test(guestbook),'Guestbook must not render user HTML');
const preview=await readFile(join(root,'src/guestbook-preview.js'),'utf8');
assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML/.test(preview),'Public comment preview must not render user HTML');
const home=html.get('index.html');
assert.equal((home.match(/data-scene\s/g)||[]).length,5,'Home must expose all five native scenes');
assert.equal((home.match(/class="scene-link"/g)||[]).length,5,'Every scene must have a direct navigation link');
assert.ok(home.includes('data-motion-toggle'),'Home must offer a motion control');
for (const name of await readdir(join(dist,'assets'))) {
  if (!/\.(js|css)$/.test(name)) continue;
  const compressed=gzipSync(await readFile(join(dist,'assets',name))).byteLength;
  const budget=name.endsWith('.css')?16_000:65_000;
  assert.ok(compressed<budget,`${name}: exceeds compressed asset budget`);
  if (name.startsWith('scroll-motion-')) {
    const code=await readFile(join(dist,'assets',name),'utf8');
    assert.ok(code.includes('Copyright 2008-2026, GreenSock') && code.includes('gsap.com/standard-license'),'Animation bundle must retain vendor notices');
  }
}
const sizes=await Promise.all((await readdir(join(dist,'images'))).map(async name=>[name,(await stat(join(dist,'images',name))).size]));
for(const [name,size] of sizes) assert.ok(size<600_000,`${name}: oversized web asset`);
console.log(`Checked ${required.length} pages, local links and anchors, responsive images, public config, and guestbook HTML handling.`);
console.log(`Image payloads: ${Math.round(sizes.reduce((sum,[,size])=>sum+size,0)/1024)} KiB total (responsive variants included).`);
