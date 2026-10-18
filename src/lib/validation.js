export function validatePublicConfig(input = {}) {
  const url = String(input.supabaseUrl || '').trim();
  const key = String(input.supabasePublishableKey || '').trim();
  const contactEmail = String(input.contactEmail || '').trim();
  const operatorName = String(input.operatorName || 'WoofLab').trim().slice(0, 120);
  if (url) {
    const parsed = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((!local && (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co'))) ||
      (local && !['http:', 'https:'].includes(parsed.protocol)) || parsed.username || parsed.password ||
      parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
      throw new Error('Use your Supabase project URL, with no path or credentials.');
    }
  }
  if (key) {
    let isPublic = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (key.split('.').length === 3) {
      try {
        const encoded = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
        isPublic = payload.role === 'anon';
      } catch { isPublic = false; }
    }
    if (!isPublic) throw new Error('Only a Supabase publishable or anon key can be used in the website. Never use a secret or service-role key.');
  }
  if (contactEmail && !/^[^\s@?&#\r\n]+@[^\s@?&#\r\n]+\.[^\s@?&#\r\n]+$/.test(contactEmail)) {
    throw new Error('The public contact email is not a valid email address.');
  }
  return Object.freeze({ supabaseUrl: url.replace(/\/$/, ''), supabasePublishableKey: key,
    contactEmail, operatorName, configured: Boolean(url && key) });
}

export function safeAvatarUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['pbs.twimg.com', 'abs.twimg.com'].includes(url.hostname) &&
      !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function safeXProfileUrl(handle) {
  return /^[A-Za-z0-9_]{1,15}$/.test(handle || '') ? `https://x.com/${handle}` : null;
}

export function validateComment(value) {
  const content = String(value || '').trim();
  if (!content) return { error: 'Give your pawprint a few words first.' };
  if (Array.from(content).length > 1000) return { error: 'Keep your note to 1,000 characters or fewer.' };
  return { content };
}
