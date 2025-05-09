
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://eynzgkbifvfsnjdtiayv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bnpna2JpZnZmc25qZHRpYXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Njk2NjQsImV4cCI6MjA2MjI0NTY2NH0.jc9XuPof8Spr1chGGltryoa1-whxxY1t82YiCepfiro";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});
