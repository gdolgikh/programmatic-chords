import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
