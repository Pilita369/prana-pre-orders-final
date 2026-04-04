import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://veamqwvbayavthmvtreh.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlYW1xd3ZiYXlhdnRobXZ0cmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjk3NTcsImV4cCI6MjA5MDY0NTc1N30.PqRtNItPV8pvgMAeCZR6KQRJKe90byq9dbWQBrbTZLs';


// Bypass the navigator.locks mechanism that causes requests to hang
// when multiple auth operations compete for the same lock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noLock = (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn();

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'prana-auth-token',
    lock: noLock,
  } as Parameters<typeof createClient>[2]['auth'],
});
