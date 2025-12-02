// Supabase Configuration
const SUPABASE_URL = "https://kfsutnshxukcebymoitu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc3V0bnNoeHVrY2VieW1vaXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTAxMjcsImV4cCI6MjA4MDE2NjEyN30.0Hk5IaAHlCSNWkrEGOjYdSViAX5zMYb25IOBYdc9El4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
