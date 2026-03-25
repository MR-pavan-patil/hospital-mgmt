import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iguyvepcapgtcklsqbzw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndXl2ZXBjYXBndGNrbHNxYnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzM0NDUsImV4cCI6MjA4OTgwOTQ0NX0.VQc2duD63owyfYLpGWnHGSDsNr0ltiKisT3kB6K2-SM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
