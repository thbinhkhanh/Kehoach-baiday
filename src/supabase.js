import { createClient } from "@supabase/supabase-js";

// 🔹 Thông tin dự án Supabase mới
const supabaseUrl = "https://hdfngeujcxzvyexuzmqr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZm5nZXVqY3h6dnlleHV6bXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MjQ2ODAsImV4cCI6MjA3NTIwMDY4MH0.zWDUKRkOrlRP8xlOTsEjJMEtj042Q5UksnG9SmikKuU";

// 🔹 Tạo client Supabase
//export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true
  }
});
