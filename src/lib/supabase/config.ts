export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabase = Boolean(supabaseUrl && supabaseKey);
export const localDemoEnabled =
  !hasSupabase &&
  (process.env.NODE_ENV === 'development' || process.env.ENABLE_LOCAL_DEMO === 'true');
