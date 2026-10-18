import { getClient } from './client.js';

export async function finishSignIn() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const providerError = params.has('error') || params.has('error_description');
  // Remove single-use authorization data from history before any further requests.
  window.history.replaceState(null, '', '/auth/callback/');
  const title = document.querySelector('#callback-title');
  const message = document.querySelector('#callback-message');
  const back = document.querySelector('#callback-back');
  try {
    const client = await getClient();
    if (!client || providerError || !code) throw new Error('Sign-in incomplete.');
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    // A fixed destination avoids accepting untrusted redirect URLs.
    window.location.replace('/guestbook/');
  } catch {
    title.textContent = 'Let’s try that again.';
    message.textContent = 'X sign-in wasn’t completed. Return to the guestbook to try again. Your public notes are still there.';
    back.hidden = false;
  }
}
