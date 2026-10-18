const PREFERENCE_KEY = 'wooflab-motion';

/** Native scrolling stays available even if observers or animation loading fail. */
export function initSlideshow({
  root = document,
  win = window,
  loadMotion = () => import('./scroll-motion.js'),
  loadPreview = () => import('./guestbook-preview.js'),
} = {}) {
  const scenes = [...root.querySelectorAll('[data-scene]')];
  if (!scenes.length) return () => {};
  const links = [...root.querySelectorAll('.scene-link')];
  const number = root.querySelector('[data-scene-number]');
  const toggle = root.querySelector('[data-motion-toggle]');
  const motionLabel = root.querySelector('[data-motion-label]');
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let savedPreference;
  try { savedPreference = win.localStorage.getItem(PREFERENCE_KEY); } catch { /* Optional preference storage. */ }
  let destroyMotion;
  let generation = 0;
  let disposed = false;
  let motionFailed = false;

  function setActive(index) {
    links.forEach((link, position) => {
      if (position === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (number) number.textContent = String(index + 1).padStart(2, '0');
  }

  async function updateMotion() {
    const currentGeneration = ++generation;
    destroyMotion?.();
    destroyMotion = undefined;
    const systemReduced = media?.matches === true;
    const reduced = systemReduced || savedPreference === 'reduce' || motionFailed;
    root.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    if (toggle) {
      toggle.hidden = false;
      toggle.disabled = systemReduced || motionFailed;
      toggle.setAttribute('aria-pressed', String(reduced));
      toggle.title = systemReduced ? 'Reduced motion is enabled in your device settings.' : motionFailed ? 'Animations are unavailable. All scenes remain readable.' : 'Turn extra movement on or off';
    }
    if (motionLabel) motionLabel.textContent = reduced ? 'Motion off' : 'Motion on';
    if (reduced) return;
    try {
      const module = await loadMotion();
      if (disposed || generation !== currentGeneration) return;
      destroyMotion = module.createSceneMotion(scenes);
    } catch {
      if (!disposed && generation === currentGeneration) {
        motionFailed = true;
        updateMotion();
      }
    }
  }

  function toggleMotion() {
    if (media?.matches || motionFailed) return;
    savedPreference = root.documentElement.dataset.motion === 'full' ? 'reduce' : 'full';
    try { win.localStorage.setItem(PREFERENCE_KEY, savedPreference); } catch { /* No persistence is required. */ }
    updateMotion();
  }
  toggle?.addEventListener('click', toggleMotion);
  media?.addEventListener?.('change', updateMotion);
  updateMotion();

  let sceneObserver;
  if (win.IntersectionObserver) {
    const visibility = new Map(scenes.map(scene => [scene, 0]));
    sceneObserver = new win.IntersectionObserver(entries => {
      for (const entry of entries) visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      let highest = 0;
      let active = 0;
      scenes.forEach((scene, index) => {
        const ratio = visibility.get(scene) || 0;
        if (ratio > highest) { highest = ratio; active = index; }
      });
      if (highest > 0) setActive(active);
    }, { threshold: [0, .1, .25, .4, .5, .6, .75, 1] });
    scenes.forEach(scene => sceneObserver.observe(scene));
  }
  function followAnchor() {
    const index = scenes.findIndex(scene => `#${scene.id}` === win.location.hash);
    if (index >= 0) setActive(index);
  }
  win.addEventListener('hashchange', followAnchor);
  followAnchor();

  const preview = root.querySelector('[data-guestbook-preview]');
  let previewObserver;
  let previewStarted = false;
  async function startPreview() {
    if (previewStarted || !preview || disposed) return;
    previewStarted = true;
    previewObserver?.disconnect();
    try {
      const module = await loadPreview();
      if (!disposed) await module.loadGuestbookPreview(preview);
    } catch {
      if (!disposed) {
        preview.replaceChildren();
        const state = root.createElement('p');
        state.className = 'preview-state';
        state.textContent = 'The latest notes are taking a little break. Open the guestbook to try again.';
        preview.append(state);
        preview.setAttribute('aria-busy', 'false');
      }
    }
  }
  if (preview) {
    if (win.IntersectionObserver) {
      previewObserver = new win.IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) startPreview();
      }, { rootMargin: '240px 0px' });
      previewObserver.observe(preview);
    } else startPreview();
  }

  return () => {
    disposed = true;
    generation++;
    destroyMotion?.();
    sceneObserver?.disconnect();
    previewObserver?.disconnect();
    toggle?.removeEventListener('click', toggleMotion);
    media?.removeEventListener?.('change', updateMotion);
    win.removeEventListener('hashchange', followAnchor);
  };
}
