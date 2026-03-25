-- ================================================================
--  MediCare HMS — SQL Schema Update for React App
--  Run this in Supabase SQL Editor AFTER the main schema
-- ================================================================

-- Add login_password column to doctors (if not already present)
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS login_password TEXT;

-- Allow anonymous users to read doctors table (for role detection on login)
CREATE POLICY "anon_read_doctors" ON doctors
  FOR SELECT TO anon
  USING (true);

-- ================================================================
--  DONE! Your database is ready for the React app.
-- ================================================================
