import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('SUPABASE URL:', url);
console.log('SUPABASE KEY:', key ? 'OK' : 'UNDEFINED');

export const supabase = createClient(
  url || 'https://veamqwvbayavthmvtreh.supabase.co',
  key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlYW1xd3ZiYXlhdnRobXZ0cmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjk3NTcsImV4cCI6MjA5MDY0NTc1N30.PqRtNItPV8pvgMAeCZR6KQRJKe90byq9dbWQBrbTZLs'
);