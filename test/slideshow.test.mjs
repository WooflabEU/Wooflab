import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { initSlideshow } from '../src/slideshow.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup({ reduced = false, hash = '' } = {}) {
  const dom = new JSDOM(html, { url: `https://wooflab.eu/${hash}` });
  const win = dom.window;
  const preference = new win.EventTarget();
  preference.matches = reduced;
  win.matchMedia = () => preference;
  const observers = [];
  win.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; this.targets = []; this.disconnected = false; observers.push(this); }
    observe(node) { this.targets.push(node); }
    disconnect() { this.disconnected = true; }
    emit(entries) { this.callback(entries); }
  };
  let loads = 0;
  let animations = 0;
  let cleanups = 0;
  let previews = 0;
  const motion = async () => { loads++; return { createSceneMotion() { animations++; return () => { cleanups++; }; } }; };
  const preview = async () => ({ loadGuestbookPreview() { previews++; } });
  const start = (overrides = {}) => initSlideshow({ root: win.document, win, loadMotion: motion, loadPreview: preview, ...overrides });
  return { dom, win, preference, observers, start, stats: () => ({ loads, animations, cleanups, previews }) };
}

test('native scene navigation reflects the most visible scene and retains unchanged observations', async () => {
  const fixture = setup();
  const dispose = fixture.start();
  await settle();
  const [observer] = fixture.observers;
  const scenes = [...fixture.win.document.querySelectorAll('[data-scene]')];
  observer.emit([{ target: scenes[1], isIntersecting: true, intersectionRatio: .8 }, { target: scenes[0], isIntersecting: true, intersectionRatio: .2 }]);
  assert.equal(fixture.win.document.querySelector('[aria-current=location]').hash, '#lab');
  assert.equal(fixture.win.document.querySelector('[data-scene-number]').textContent, '02');
  observer.emit([{ target: scenes[2], isIntersecting: true, intersectionRatio: .15 }]);
  assert.equal(fixture.win.document.querySelector('[data-scene-number]').textContent, '02');
  dispose();
  fixture.dom.window.close();
});

test('direct scene links update the location indicator without a custom wheel handler', async () => {
  const fixture = setup({ hash: '#byte' });
  const dispose = fixture.start();
  assert.equal(fixture.win.document.querySelector('[data-scene-number]').textContent, '04');
  fixture.win.location.hash = '#pawprints';
  fixture.win.dispatchEvent(new fixture.win.Event('hashchange'));
  assert.equal(fixture.win.document.querySelector('[data-scene-number]').textContent, '05');
  await settle();
  dispose();
  fixture.dom.window.close();
});

test('system reduced motion starts with static content and no animation module', async () => {
  const fixture = setup({ reduced: true });
  const dispose = fixture.start();
  await settle();
  assert.equal(fixture.stats().loads, 0);
  assert.equal(fixture.win.document.documentElement.dataset.motion, 'reduced');
  assert.equal(fixture.win.document.querySelector('[data-motion-toggle]').disabled, true);
  fixture.preference.matches = false;
  fixture.preference.dispatchEvent(new fixture.win.Event('change'));
  await settle();
  assert.equal(fixture.stats().animations, 1);
  assert.equal(fixture.win.document.documentElement.dataset.motion, 'full');
  dispose();
  fixture.dom.window.close();
});

test('turning motion off removes animations, persists the choice and can be reversed', async () => {
  const fixture = setup();
  const dispose = fixture.start();
  await settle();
  const button = fixture.win.document.querySelector('[data-motion-toggle]');
  button.click();
  assert.equal(fixture.stats().cleanups, 1);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(fixture.win.localStorage.getItem('wooflab-motion'), 'reduce');
  button.click();
  await settle();
  assert.equal(fixture.stats().animations, 2);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  dispose();
  assert.equal(fixture.stats().cleanups, 2);
  assert.ok(fixture.observers.every(observer => observer.disconnected));
  fixture.dom.window.close();
});

test('a late animation download cannot enable motion after the visitor has disabled it', async () => {
  const fixture = setup();
  let resolveMotion;
  let started = false;
  const pending = new Promise(resolve => { resolveMotion = resolve; });
  const dispose = fixture.start({ loadMotion: () => pending });
  fixture.win.document.querySelector('[data-motion-toggle]').click();
  resolveMotion({ createSceneMotion() { started = true; } });
  await settle();
  assert.equal(started, false);
  assert.equal(fixture.win.document.documentElement.dataset.motion, 'reduced');
  dispose();
  fixture.dom.window.close();
});

test('public comments are loaded once near their scene, never at initial page load', async () => {
  const fixture = setup();
  const dispose = fixture.start();
  await settle();
  assert.equal(fixture.stats().previews, 0);
  const observer = fixture.observers[1];
  const entry = { target: observer.targets[0], isIntersecting: true };
  observer.emit([entry]);
  observer.emit([entry]);
  await settle();
  assert.equal(fixture.stats().previews, 1);
  assert.equal(observer.disconnected, true);
  dispose();
  fixture.dom.window.close();
});

test('failed motion loading leaves a readable, navigable static page', async () => {
  const fixture = setup();
  const dispose = fixture.start({ loadMotion: async () => { throw new Error('offline'); } });
  await settle();
  assert.equal(fixture.win.document.documentElement.dataset.motion, 'reduced');
  assert.equal(fixture.win.document.querySelector('[data-motion-label]').textContent, 'Motion off');
  assert.equal(fixture.win.document.querySelectorAll('[data-scene]').length, 5);
  assert.equal(fixture.win.document.querySelectorAll('[data-open-tool]').length, 2);
  dispose();
  fixture.dom.window.close();
});

test('blocked local preference storage does not stop the slideshow', async () => {
  const fixture = setup();
  Object.defineProperty(fixture.win, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  const dispose = fixture.start();
  await settle();
  fixture.win.document.querySelector('[data-motion-toggle]').click();
  assert.equal(fixture.win.document.documentElement.dataset.motion, 'reduced');
  dispose();
  fixture.dom.window.close();
});
