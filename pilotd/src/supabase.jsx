import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 *
 * PLACEHOLDER VALUES - Replace with your actual Supabase credentials:
 * 1. Create a new project at https://supabase.com
 * 2. Go to Project Settings > API
 * 3. Copy your Project URL and anon/public key
 * 4. Replace the values below OR use environment variables
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
