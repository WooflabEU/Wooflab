import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { initSiteShell } from '../src/site-shell.js';

const header = await readFile(new URL('../src/partials/header.html', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/partials/footer.html', import.meta.url), 'utf8');
const pages = ['index.html', 'guestbook/index.html', 'privacy/index.html', 'terms/index.html', 'auth/callback/index.html', '404.html'];

for (const path of pages) {
  test(`shared menu, focus handling and current-page links work on ${path}`, async () => {
    const source = (await readFile(new URL(`../${path}`, import.meta.url), 'utf8'))
      .replace('<!-- partial:header -->', header)
      .replace('<!-- partial:footer -->', footer);
    const dom = new JSDOM(source, { url: `https://wooflab.eu/${path}` });
    const doc = dom.window.document;
    const dispose = initSiteShell(doc);
    const toggle = doc.querySelector('.nav-toggle');
    const nav = doc.querySelector('#site-nav');
    assert.equal(doc.querySelectorAll('.site-header').length, 1);
    assert.equal(doc.querySelectorAll('.site-footer').length, 1);
    assert.equal(doc.querySelector('[data-year]').textContent, String(new Date().getFullYear()));
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(nav.classList.contains('is-open'), true);
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(doc.activeElement, toggle);
    toggle.click();
    const link = nav.querySelector('a');
    link.addEventListener('click', event => event.preventDefault());
    link.click();
    assert.equal(nav.classList.contains('is-open'), false);
    const current = [...doc.querySelectorAll('[data-nav][aria-current]')];
    const page = doc.body.dataset.page;
    if (['guestbook', 'privacy', 'terms'].includes(page)) {
      assert.ok(current.length > 0);
      assert.ok(current.every(node => node.dataset.nav === page));
      assert.equal(current.length, doc.querySelectorAll(`[data-nav="${page}"]`).length);
    } else assert.equal(current.length, 0);
    dispose();
    toggle.click();
    assert.equal(nav.classList.contains('is-open'), false);
    dom.window.close();
  });
}
