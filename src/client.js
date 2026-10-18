import { createClient } from '@supabase/supabase-js';
import { getConfig } from './config.js';

let clientPromise;
export function getClient() {
  clientPromise ??= getConfig().then(config => config.configured ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, storageKey: 'wooflab-session-v1' },
  }) : null);
  return clientPromise;
}
