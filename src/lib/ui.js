import { safeAvatarUrl } from './validation.js';

let toastTimeout;
export function toast(message) {
  const target = document.querySelector('#toast');
  if (!target) return;
  clearTimeout(toastTimeout);
  target.textContent = message;
  target.hidden = false;
  toastTimeout = setTimeout(() => { target.hidden = true; }, 4200);
}

export function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function fillAvatar(target, profile) {
  const name = profile?.display_name || 'X member';
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] || '').join('').toUpperCase();
  target.replaceChildren(document.createTextNode(initials || 'X'));
  const safeUrl = safeAvatarUrl(profile?.avatar_url);
  if (!safeUrl) return;
  const img = create('img');
  img.src = safeUrl;
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => img.remove(), { once: true });
  target.append(img);
}

export function friendlyError(error) {
  const message = String(error?.message || '');
  if (message.includes('rate_limit')) return 'One pawprint at a time. Please wait 30 seconds between notes.';
  if (message.includes('x_identity_required')) return 'Please sign in with X again before posting.';
  if (message.includes('comment_length')) return 'Your note needs to be between 1 and 1,000 characters.';
  if (['401', '403'].includes(String(error?.status)) || error?.code === 'PGRST301' || /jwt.*expired/i.test(message)) {
    return 'Your sign-in has expired. Please sign in with X again.';
  }
  return 'That didn’t go through. Your draft is still here. Please try again in a moment.';
}
