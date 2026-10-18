import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validatePublicConfig } from './src/lib/validation.js';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'wooflab-html-partials',
    configResolved(config) {
      const json = JSON.parse(readFileSync(`${root}public/site-config.json`, 'utf8'));
      const env = loadEnv(config.mode, root, 'VITE_');
      validatePublicConfig({ ...json,
        supabaseUrl: env.VITE_SUPABASE_URL || json.supabaseUrl,
        supabasePublishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || json.supabasePublishableKey,
        contactEmail: env.VITE_CONTACT_EMAIL || json.contactEmail,
      });
    },
    transformIndexHtml(html) {
      return html.replace(/<!-- partial:(header|footer) -->/g, (_, name) =>
        readFileSync(`${root}src/partials/${name}.html`, 'utf8'));
    },
  }],
  // These are real static pages: direct navigation works on Cloudflare Pages.
  build: {
    target: 'es2022', cssCodeSplit: false, sourcemap: false,
    rollupOptions: { input: {
      home: `${root}index.html`,
      guestbook: `${root}guestbook/index.html`,
      privacy: `${root}privacy/index.html`,
      terms: `${root}terms/index.html`,
      callback: `${root}auth/callback/index.html`,
      notFound: `${root}404.html`,
    } },
  },
});
