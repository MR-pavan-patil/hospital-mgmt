// =============================================
//  SUPABASE CONFIG — Replace with your values
//  Go to: https://supabase.com → Your Project → Settings → API
// =============================================
const SUPABASE_URL = 'https://zypbjdtxsnqepppmlbed.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cGJqZHR4c25xZXBwcG1sYmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQyMTcsImV4cCI6MjA4OTI4MDIxN30.y5N_vjvJ52DDcCCET3S-52KHXDka6RmMilnB85xNXig';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);