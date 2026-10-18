/** Shared navigation behavior, used on the homepage and every secondary page. */
export function initSiteShell(root = document) {
  const page = root.body.dataset.page;
  root.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
  root.querySelectorAll(`[data-nav="${page}"]`).forEach(link => link.setAttribute('aria-current', 'page'));
  const toggle = root.querySelector('.nav-toggle');
  const nav = root.querySelector('#site-nav');
  if (!toggle || !nav) return () => {};

  function close() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  }
  function toggleNav() {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
  function onKey(event) {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
  }
  const links = [...nav.querySelectorAll('a')];
  toggle.addEventListener('click', toggleNav);
  links.forEach(link => link.addEventListener('click', close));
  root.addEventListener('keydown', onKey);
  return () => {
    toggle.removeEventListener('click', toggleNav);
    links.forEach(link => link.removeEventListener('click', close));
    root.removeEventListener('keydown', onKey);
  };
}
