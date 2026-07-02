import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables exposed by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail early if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Initialize and export the single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);