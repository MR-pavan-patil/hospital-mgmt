// =============================================
//  SUPABASE CONFIG — Replace with your values
//  Go to: https://supabase.com → Your Project → Settings → API
// =============================================
const SUPABASE_URL = 'https://inpobwdpvnqozznmgjzq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucG9id2Rwdm5xb3p6bm1nanpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTg2MzQsImV4cCI6MjA4OTc5NDYzNH0.CASWHGfBdTGC1_4wjKn2o2DZdYecyPFatJ_o6LmrFxI';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);