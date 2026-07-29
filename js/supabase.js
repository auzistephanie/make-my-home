// Supabase client init — anon/publishable key only, safe to ship in code (RLS protects data).
// Requires the supabase-js CDN script tag loaded before this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
const SUPABASE_URL = 'https://cmtubaxlniglklmdwlzs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_14eHJNNxAJC1arpj9xM58Q_2Z-EtEtG';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
