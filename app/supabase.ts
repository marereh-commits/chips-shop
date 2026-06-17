import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kqudwmgqawihcgutaqjk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdWR3bWdxYXdpaGNndXRhcWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDg0MDIsImV4cCI6MjA5NzAyNDQwMn0.oSLDGgOSA0AeMgaT0fsidTwHvmYRp9qCxtl9eZWZLBc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);