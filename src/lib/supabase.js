import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase keys are configured and are not the placeholder strings
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://여기에-프로젝트-주소.supabase.co' &&
  !supabaseUrl.includes('여기에') &&
  !supabaseAnonKey.includes('여기에') &&
  supabaseAnonKey.startsWith('eyJ')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
