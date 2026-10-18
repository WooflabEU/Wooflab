import { validatePublicConfig } from './lib/validation.js';

let configPromise;
export function getConfig() {
  configPromise ??= (async () => {
    const response = await fetch('/site-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('The site configuration is unavailable.');
    const json = await response.json();
    return validatePublicConfig({ ...json,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || json.supabaseUrl,
      supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || json.supabasePublishableKey,
      contactEmail: import.meta.env.VITE_CONTACT_EMAIL || json.contactEmail,
    });
  })();
  return configPromise;
}
