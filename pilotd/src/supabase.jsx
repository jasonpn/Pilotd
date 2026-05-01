import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Store session in localStorage (persists across page refreshes)
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
