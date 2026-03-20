-- ================================================================
--  MediCare HMS — Complete SQL Schema v7
--  Supabase → SQL Editor → New Query → Run All
-- ================================================================

-- ══════════════════════════════════════════════════
-- SECTION A: TABLES
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id   UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin','doctor','receptionist','pharmacist','lab_technician'))
       DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  dob               DATE,
  gender            TEXT CHECK (gender IN ('Male','Female','Other')),
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  blood_group       TEXT,
  emergency_contact TEXT,
  allergies         TEXT,
  chronic_conditions TEXT,
  insurance_id      TEXT,
  weight_kg         NUMERIC,
  height_cm         NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  specialization   TEXT,
  phone            TEXT,
  email            TEXT,
  availability     TEXT,
  fee              NUMERIC DEFAULT 0,
  qualification    TEXT,
  reg_number       TEXT,
  experience_years INT,
  bio              TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id        UUID REFERENCES doctors(id)  ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  status           TEXT CHECK (status IN ('scheduled','completed','cancelled')) DEFAULT 'scheduled',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID REFERENCES patients(id)     ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  total_amount   NUMERIC NOT NULL DEFAULT 0,
  paid_amount    NUMERIC DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('pending','partial','paid')) DEFAULT 'pending',
  payment_method TEXT,
  items          JSONB,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id  UUID REFERENCES doctors(id)  ON DELETE SET NULL,
  test_name  TEXT NOT NULL,
  test_date  DATE,
  result     TEXT,
  status     TEXT CHECK (status IN ('pending','completed')) DEFAULT 'pending',
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name  TEXT NOT NULL,
  generic_name   TEXT,
  category       TEXT,
  stock_quantity INT DEFAULT 0,
  unit_price     NUMERIC DEFAULT 0,
  expiry_date    DATE,
  manufacturer   TEXT,
  image_url      TEXT,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID REFERENCES patients(id) ON DELETE CASCADE,
  record_type  TEXT CHECK (record_type IN ('visit','surgery','lab','medicine','allergy')) DEFAULT 'visit',
  title        TEXT NOT NULL,
  description  TEXT,
  doctor_notes TEXT,
  record_date  DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week TEXT CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  slot_type   TEXT CHECK (slot_type IN ('available','break','leave')) DEFAULT 'available',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id  UUID REFERENCES doctors(id)  ON DELETE SET NULL,
  diagnosis  TEXT,
  medicines  JSONB,
  notes      TEXT,
  rx_date    DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- SECTION B: ALTER TABLE (run if DB already exists)
-- ══════════════════════════════════════════════════

ALTER TABLE billing   ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE patients  ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients  ADD COLUMN IF NOT EXISTS chronic_conditions TEXT;
ALTER TABLE patients  ADD COLUMN IF NOT EXISTS insurance_id TEXT;
ALTER TABLE patients  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE patients  ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE doctors   ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE doctors   ADD COLUMN IF NOT EXISTS reg_number TEXT;
ALTER TABLE doctors   ADD COLUMN IF NOT EXISTS experience_years INT;
ALTER TABLE doctors   ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE pharmacy_inventory ADD COLUMN IF NOT EXISTS generic_name TEXT;
ALTER TABLE pharmacy_inventory ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE pharmacy_inventory ADD COLUMN IF NOT EXISTS description TEXT;

-- ══════════════════════════════════════════════════
-- SECTION C: ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','patients','doctors','appointments','billing',
    'lab_reports','pharmacy_inventory','medical_records',
    'doctor_schedules','prescriptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "auth_all_%I" ON %I;', t, t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    EXECUTE format(
      'CREATE POLICY "auth_all_%I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t, t
    );
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════
-- SECTION D: INDEXES (performance)
-- ══════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_appt_date     ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appt_status   ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appt_patient  ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_doctor   ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_bill_status   ON billing(payment_status);
CREATE INDEX IF NOT EXISTS idx_bill_patient  ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_bill_created  ON billing(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_patient   ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_status    ON lab_reports(status);
CREATE INDEX IF NOT EXISTS idx_rx_patient    ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_date       ON prescriptions(rx_date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_name  ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patient_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_doctor_name   ON doctors(name);
CREATE INDEX IF NOT EXISTS idx_pharma_name   ON pharmacy_inventory(medicine_name);
CREATE INDEX IF NOT EXISTS idx_pharma_expiry ON pharmacy_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_medrec_pat    ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_sched_doc     ON doctor_schedules(doctor_id);

-- ══════════════════════════════════════════════════
-- SECTION E: USEFUL VIEWS
-- ══════════════════════════════════════════════════

-- Today's appointments with full details
DROP VIEW IF EXISTS today_appointments CASCADE;
CREATE VIEW today_appointments AS
SELECT
  a.id, a.appointment_date, a.appointment_time, a.status, a.notes,
  p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone,
  p.blood_group, p.allergies,
  d.id AS doctor_id, d.name AS doctor_name, d.specialization, d.fee
FROM appointments a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN doctors d ON a.doctor_id = d.id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.appointment_time NULLS LAST;

-- Billing summary per patient
DROP VIEW IF EXISTS billing_summary CASCADE;
CREATE VIEW billing_summary AS
SELECT
  p.id AS patient_id, p.name AS patient_name, p.phone,
  COUNT(b.id)                                    AS total_bills,
  COALESCE(SUM(b.total_amount), 0)               AS total_charged,
  COALESCE(SUM(b.paid_amount), 0)                AS total_paid,
  COALESCE(SUM(b.total_amount - b.paid_amount), 0) AS total_due
FROM patients p
LEFT JOIN billing b ON b.patient_id = p.id
GROUP BY p.id, p.name, p.phone
ORDER BY total_due DESC;

-- Pending bills (for collection)
DROP VIEW IF EXISTS pending_bills CASCADE;
CREATE VIEW pending_bills AS
SELECT
  b.id, b.created_at, b.total_amount, b.paid_amount,
  (b.total_amount - b.paid_amount) AS due_amount,
  b.payment_status, b.payment_method,
  p.name AS patient_name, p.phone AS patient_phone
FROM billing b
JOIN patients p ON b.patient_id = p.id
WHERE b.payment_status != 'paid'
ORDER BY b.created_at DESC;

-- Low stock medicines
DROP VIEW IF EXISTS low_stock_medicines CASCADE;
CREATE VIEW low_stock_medicines AS
SELECT id, medicine_name, generic_name, category,
  stock_quantity, unit_price, expiry_date, manufacturer
FROM pharmacy_inventory
WHERE stock_quantity < 10
   OR (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE + INTERVAL '30 days')
ORDER BY stock_quantity ASC, expiry_date ASC;

-- Doctor appointment stats
DROP VIEW IF EXISTS doctor_stats CASCADE;
CREATE VIEW doctor_stats AS
SELECT
  d.id, d.name, d.specialization, d.fee,
  COUNT(a.id)                                        AS total_appointments,
  COUNT(a.id) FILTER (WHERE a.status = 'completed')  AS completed,
  COUNT(a.id) FILTER (WHERE a.status = 'scheduled')  AS upcoming,
  COALESCE(SUM(b.paid_amount), 0)                    AS total_revenue
FROM doctors d
LEFT JOIN appointments a ON a.doctor_id = d.id
LEFT JOIN billing b ON b.appointment_id = a.id
GROUP BY d.id, d.name, d.specialization, d.fee
ORDER BY total_appointments DESC;

-- ══════════════════════════════════════════════════
-- SECTION F: AUTO-PROFILE TRIGGER
-- ══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_doctor_name TEXT;
BEGIN
  -- Check if this email exists in doctors table → auto-assign doctor role
  SELECT name INTO v_doctor_name
  FROM public.doctors
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
     OR LOWER(TRIM(email)) = LOWER(TRIM(NEW.raw_user_meta_data->>'email'))
  LIMIT 1;

  IF v_doctor_name IS NOT NULL THEN
    -- This is a registered doctor
    v_role := 'doctor';
    v_name := v_doctor_name;
  ELSE
    -- Use metadata role (default admin)
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));
  END IF;

  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, v_name, v_role)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        role = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════════
-- SECTION G: USEFUL QUERIES (copy-paste to run)
-- ══════════════════════════════════════════════════

-- === PATIENTS ===

-- All patients with age
-- SELECT name, gender, blood_group, phone,
--   DATE_PART('year', AGE(dob)) AS age,
--   allergies, chronic_conditions
-- FROM patients ORDER BY created_at DESC;

-- Patient search by name or phone
-- SELECT * FROM patients
-- WHERE name ILIKE '%pavan%' OR phone LIKE '%9606%'
-- ORDER BY name;

-- === DOCTORS ===

-- All doctors with appointment count
-- SELECT d.name, d.specialization, d.fee,
--   COUNT(a.id) AS total_appointments
-- FROM doctors d
-- LEFT JOIN appointments a ON a.doctor_id = d.id
-- GROUP BY d.id ORDER BY total_appointments DESC;

-- === APPOINTMENTS ===

-- Today's schedule
-- SELECT * FROM today_appointments;

-- Upcoming appointments (next 7 days)
-- SELECT a.appointment_date, a.appointment_time,
--   p.name AS patient, d.name AS doctor, d.specialization
-- FROM appointments a
-- JOIN patients p ON a.patient_id = p.id
-- LEFT JOIN doctors d ON a.doctor_id = d.id
-- WHERE a.appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
--   AND a.status = 'scheduled'
-- ORDER BY a.appointment_date, a.appointment_time;

-- === BILLING ===

-- All pending bills
-- SELECT * FROM pending_bills LIMIT 50;

-- Revenue by month
-- SELECT
--   DATE_TRUNC('month', created_at) AS month,
--   SUM(paid_amount) AS collected,
--   SUM(total_amount) AS billed,
--   SUM(total_amount - paid_amount) AS pending
-- FROM billing
-- GROUP BY 1 ORDER BY 1 DESC LIMIT 12;

-- === PHARMACY ===

-- Low stock / expiring
-- SELECT * FROM low_stock_medicines;

-- === ADMIN ===

-- Set a user's role to doctor
-- UPDATE profiles SET role = 'doctor' WHERE id = '<user-uuid>';

-- Check all user roles
-- SELECT p.name, p.role, u.email, u.created_at
-- FROM profiles p JOIN auth.users u ON p.id = u.id
-- ORDER BY p.role, p.name;


-- ══════════════════════════════════════════════════
-- SECTION H: SAMPLE DATA — 10 Doctors + 20 Patients
-- Run this ONCE after setting up tables
-- ══════════════════════════════════════════════════

-- === 10 Sample Doctors ===
INSERT INTO doctors (name, specialization, phone, email, fee, qualification, experience_years, reg_number, availability, login_password) VALUES
('Dr. Rajesh Sharma',    'Cardiologist',      '9876543210', 'rajesh.sharma@medicare.demo',    800,  'MBBS, MD (Cardiology)',    15, 'MCI-KA-2009-1234', 'Mon-Fri 9AM-2PM',   'MediCare@Rajesh4521'),
('Dr. Priya Nair',       'Gynaecologist',     '9876543211', 'priya.nair@medicare.demo',       700,  'MBBS, MS (OBG)',           12, 'MCI-KA-2012-2345', 'Mon-Sat 10AM-4PM',  'MediCare@Priya7832'),
('Dr. Suresh Patil',     'Neurologist',       '9876543212', 'suresh.patil@medicare.demo',     900,  'MBBS, DM (Neurology)',     18, 'MCI-KA-2006-3456', 'Tue-Sat 11AM-3PM',  'MediCare@Suresh3901'),
('Dr. Anita Desai',      'Paediatrician',     '9876543213', 'anita.desai@medicare.demo',      600,  'MBBS, MD (Paediatrics)',   10, 'MCI-KA-2014-4567', 'Mon-Fri 9AM-1PM',   'MediCare@Anita6213'),
('Dr. Vikram Reddy',     'Orthopaedic',       '9876543214', 'vikram.reddy@medicare.demo',     750,  'MBBS, MS (Ortho)',         14, 'MCI-KA-2010-5678', 'Mon-Wed-Fri 10AM-4PM','MediCare@Vikram8934'),
('Dr. Meera Joshi',      'Dermatologist',     '9876543215', 'meera.joshi@medicare.demo',      650,  'MBBS, MD (Dermatology)',   8,  'MCI-KA-2016-6789', 'Mon-Sat 11AM-5PM',  'MediCare@Meera2456'),
('Dr. Arjun Kulkarni',   'General Physician', '9876543216', 'arjun.kulkarni@medicare.demo',   500,  'MBBS, MD (General)',       6,  'MCI-KA-2018-7890', 'Mon-Sat 8AM-12PM',  'MediCare@Arjun5678'),
('Dr. Sunita Hegde',     'ENT Specialist',    '9876543217', 'sunita.hegde@medicare.demo',     700,  'MBBS, MS (ENT)',           11, 'MCI-KA-2013-8901', 'Tue-Thu-Sat 10AM-3PM','MediCare@Sunita1234'),
('Dr. Ravi Kumar',       'Psychiatrist',      '9876543218', 'ravi.kumar@medicare.demo',       1000, 'MBBS, MD (Psychiatry)',    20, 'MCI-KA-2004-9012', 'Mon-Fri 2PM-6PM',   'MediCare@Ravi9012'),
('Dr. Deepa Menon',      'Radiologist',       '9876543219', 'deepa.menon@medicare.demo',      850,  'MBBS, MD (Radiology)',     13, 'MCI-KA-2011-0123', 'Mon-Fri 9AM-5PM',   'MediCare@Deepa3456')
ON CONFLICT DO NOTHING;

-- === 20 Sample Patients ===
INSERT INTO patients (name, dob, gender, phone, email, blood_group, address, emergency_contact, allergies, chronic_conditions) VALUES
('Pavan Patil',         '2005-05-03', 'Male',   '9606558427', 'pavan.patil@gmail.com',     'A-',  'Bidar, Karnataka',          '9876500001', NULL,           NULL),
('Sneha Kulkarni',      '1992-08-15', 'Female', '9845632100', 'sneha.k@gmail.com',         'B+',  'Gulbarga, Karnataka',       '9876500002', 'Penicillin',   'Asthma'),
('Rahul Desai',         '1985-03-22', 'Male',   '9987654321', 'rahul.desai@gmail.com',     'O+',  'Bidar, Karnataka',          '9876500003', NULL,           'Diabetes Type 2'),
('Anjali Sharma',       '1998-11-10', 'Female', '9765432198', 'anjali.s@gmail.com',        'AB+', 'Latur, Maharashtra',        '9876500004', NULL,           NULL),
('Mohd. Imran',         '1978-06-05', 'Male',   '9876541230', 'imran.m@gmail.com',         'B-',  'Bidar, Karnataka',          '9876500005', 'Sulfa drugs',  'Hypertension'),
('Kavitha Reddy',       '2000-01-28', 'Female', '9654321780', 'kavitha.r@gmail.com',       'A+',  'Hyderabad, Telangana',      '9876500006', NULL,           NULL),
('Sunil Nair',          '1972-09-14', 'Male',   '9543217890', 'sunil.n@gmail.com',         'O-',  'Bidar, Karnataka',          '9876500007', NULL,           'Hypertension, Diabetes'),
('Pooja Jain',          '1995-04-30', 'Female', '9432178901', 'pooja.j@gmail.com',         'B+',  'Solapur, Maharashtra',      '9876500008', 'Aspirin',      NULL),
('Arun Kumar',          '1965-12-08', 'Male',   '9321789012', 'arun.k@gmail.com',          'AB-', 'Bidar, Karnataka',          '9876500009', NULL,           'Heart Disease'),
('Meena Iyer',          '2003-07-19', 'Female', '9210890123', 'meena.i@gmail.com',         'A+',  'Bangalore, Karnataka',      '9876500010', NULL,           NULL),
('Rajan Patil',         '1988-02-25', 'Male',   '9109012345', 'rajan.p@gmail.com',         'O+',  'Bidar, Karnataka',          '9876500011', 'Ibuprofen',    NULL),
('Lakshmi Devi',        '1980-10-12', 'Female', '9890123456', 'lakshmi.d@gmail.com',       'B+',  'Gulbarga, Karnataka',       '9876500012', NULL,           'Thyroid'),
('Prakash Hegde',       '1970-05-20', 'Male',   '9789012345', 'prakash.h@gmail.com',       'A-',  'Bidar, Karnataka',          '9876500013', NULL,           'COPD'),
('Sunita Rao',          '1993-08-08', 'Female', '9678901234', 'sunita.r@gmail.com',        'O+',  'Hyderabad, Telangana',      '9876500014', 'Pollen',       'Allergic Rhinitis'),
('Vijay Malhotra',      '1960-03-15', 'Male',   '9567890123', 'vijay.m@gmail.com',         'AB+', 'Bidar, Karnataka',          '9876500015', NULL,           'Hypertension, Arthritis'),
('Rekha Shetty',        '2001-11-22', 'Female', '9456789012', 'rekha.s@gmail.com',         'B-',  'Mangalore, Karnataka',      '9876500016', NULL,           NULL),
('Ganesh Bhat',         '1975-07-04', 'Male',   '9345678901', 'ganesh.b@gmail.com',        'O+',  'Bidar, Karnataka',          '9876500017', 'Latex',        'Eczema'),
('Archana Pillai',      '1990-09-18', 'Female', '9234567890', 'archana.p@gmail.com',       'A+',  'Kochi, Kerala',             '9876500018', NULL,           NULL),
('Sanjay Verma',        '1983-04-07', 'Male',   '9123456789', 'sanjay.v@gmail.com',        'B+',  'Bidar, Karnataka',          '9876500019', NULL,           'Migraine'),
('Nisha Gupta',         '1997-06-14', 'Female', '9012345678', 'nisha.g@gmail.com',         'AB+', 'Pune, Maharashtra',         '9876500020', 'Amoxicillin',  NULL)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════
-- DOCTOR LOGIN CREDENTIALS TABLE (for admin reference)
-- To view all doctor logins:
-- SELECT name, email, login_password FROM doctors WHERE login_password IS NOT NULL;
-- ══════════════════════════════════════════════════

-- ══════════════════════════════════════════════════
-- ✅ SETUP COMPLETE!
-- 1. js/config.js → add SUPABASE_URL + ANON_KEY
-- 2. Open index.html with VS Code Live Server
-- 3. Register admin account → login
-- 4. Add doctors with email → credentials auto-generated
-- 5. Pharmacy → Import CSV → medicines.csv
-- ══════════════════════════════════════════════════
