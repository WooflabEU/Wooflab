import '@fontsource-variable/space-grotesk';
import './theme.css';
import './styles.css';
import './slideshow.css';
import { getConfig } from './config.js';
import { toast } from './lib/ui.js';
import { initSiteShell } from './site-shell.js';

document.documentElement.classList.add('js');
const page = document.body.dataset.page;
initSiteShell();
if (page === 'home') {
  import('./slideshow.js').then(module => module.initSlideshow()).catch(() => {
    document.documentElement.dataset.motion = 'reduced';
  });
}
getConfig().then(config => {
  document.querySelectorAll('[data-operator]').forEach(node => { node.textContent = config.operatorName; });
  if (config.contactEmail) {
    document.querySelectorAll('[data-contact]').forEach(link => {
      link.href = `mailto:${config.contactEmail}`;
      link.hidden = false;
    });
    document.querySelectorAll('[data-privacy-contact]').forEach(node => { node.hidden = false; });
  }
}).catch(() => { /* Keep the public pages usable if configuration is unavailable. */ });

document.querySelectorAll('[data-open-tool]').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      const { openTool } = await import('./tools.js');
      openTool(button.dataset.openTool);
    } catch { toast('The tool couldn’t open. Please refresh and try again.'); }
  });
});

if (page === 'guestbook') {
  import('./guestbook.js').then(module => module.initGuestbook()).catch(() => {
    document.querySelector('#auth-loading').hidden = true;
    document.querySelector('#auth-offline').hidden = false;
    document.querySelector('#feed-status').textContent = 'The guestbook is taking a short break. Please try again later.';
    document.querySelector('#comments-list').setAttribute('aria-busy', 'false');
  });
}
if (page === 'callback') {
  import('./auth.js').then(module => module.finishSignIn()).catch(() => {
    document.querySelector('#callback-title').textContent = 'Let’s try that again.';
    document.querySelector('#callback-message').textContent = 'Sign-in could not be completed. Please return to the guestbook and try again.';
    document.querySelector('#callback-back').hidden = false;
  });
}
