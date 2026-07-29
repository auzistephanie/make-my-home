// Supabase client init — anon/publishable key only, safe to ship in code (RLS protects data).
// Requires the supabase-js CDN script tag loaded before this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
const SUPABASE_URL = 'https://cmtubaxlniglklmdwlzs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_14eHJNNxAJC1arpj9xM58Q_2Z-EtEtG';

// NOTE (found + fixed during Phase 3 browser testing, 2026-07-30): the supabase-js
// UMD bundle declares its own top-level `var supabase = ...` (the SDK namespace,
// with .createClient etc). A sibling `const supabase = ...` here collides with that
// var across script tags — same global scope — and throws a SyntaxError ("Identifier
// 'supabase' has already been declared") that silently kills every script after it,
// so `supabase.auth`/`supabase.from` were undefined everywhere. Fix: reassign the
// same global binding instead of re-declaring it.
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
