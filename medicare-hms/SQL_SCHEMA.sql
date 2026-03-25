-- ================================================================
--  MediCare HMS — Complete SQL Schema
--  Supabase → SQL Editor → New Query → Paste All → Run
-- ================================================================


-- ══════════════════════════════════════════════════
-- SECTION A: TABLES
-- ══════════════════════════════════════════════════

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT CHECK (role IN ('admin','doctor')) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients
CREATE TABLE IF NOT EXISTS patients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  dob                DATE,
  gender             TEXT CHECK (gender IN ('Male','Female','Other')),
  phone              TEXT,
  email              TEXT,
  address            TEXT,
  blood_group        TEXT,
  emergency_contact  TEXT,
  allergies          TEXT,
  chronic_conditions TEXT,
  insurance_id       TEXT,
  weight_kg          NUMERIC,
  height_cm          NUMERIC,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Doctors
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
  login_password   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Appointments
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

-- 5. Billing
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

-- 6. Lab Reports
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

-- 7. Pharmacy Inventory
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

-- 8. Prescriptions
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

-- 9. Doctor Schedules
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

-- 10. Medical Records
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


-- ══════════════════════════════════════════════════
-- SECTION B: ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records   ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access on all tables
CREATE POLICY "auth_all_profiles"           ON profiles           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_patients"           ON patients           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_doctors"            ON doctors            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_appointments"       ON appointments       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_billing"            ON billing            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_lab_reports"        ON lab_reports        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pharmacy_inventory" ON pharmacy_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_prescriptions"      ON prescriptions      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_doctor_schedules"   ON doctor_schedules   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_medical_records"    ON medical_records    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon users: can read doctors table (needed for role detection during login)
CREATE POLICY "anon_read_doctors" ON doctors FOR SELECT TO anon USING (true);


-- ══════════════════════════════════════════════════
-- SECTION C: INDEXES (performance)
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
-- SECTION D: AUTH TRIGGER (auto-create profile on signup)
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
  LIMIT 1;

  IF v_doctor_name IS NOT NULL THEN
    v_role := 'doctor';
    v_name := v_doctor_name;
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
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
-- SECTION E: SAMPLE DATA — 10 Doctors
-- ══════════════════════════════════════════════════

INSERT INTO doctors (name, specialization, phone, email, fee, qualification, experience_years, reg_number, availability, bio, login_password) VALUES
('Dr. Rajesh Sharma',    'Cardiologist',       '9876543210', 'rajesh.sharma@medicare.demo',    800,  'MBBS, MD (Cardiology)',     15, 'MCI-KA-2009-1234', 'Mon-Fri 9AM-2PM',       'Specializes in interventional cardiology and heart failure management.',  'MediCare@Rajesh4521'),
('Dr. Priya Nair',       'Gynaecologist',      '9876543211', 'priya.nair@medicare.demo',       700,  'MBBS, MS (OBG)',            12, 'MCI-KA-2012-2345', 'Mon-Sat 10AM-4PM',      'Expert in high-risk pregnancies and laparoscopic surgery.',               'MediCare@Priya7832'),
('Dr. Suresh Patil',     'Neurologist',        '9876543212', 'suresh.patil@medicare.demo',     900,  'MBBS, DM (Neurology)',      18, 'MCI-KA-2006-3456', 'Tue-Sat 11AM-3PM',      'Specializes in stroke management and epilepsy treatment.',               'MediCare@Suresh3901'),
('Dr. Anita Desai',      'Paediatrician',      '9876543213', 'anita.desai@medicare.demo',      600,  'MBBS, MD (Paediatrics)',    10, 'MCI-KA-2014-4567', 'Mon-Fri 9AM-1PM',       'Child health specialist with focus on developmental disorders.',         'MediCare@Anita6213'),
('Dr. Vikram Reddy',     'Orthopaedic',        '9876543214', 'vikram.reddy@medicare.demo',     750,  'MBBS, MS (Ortho)',          14, 'MCI-KA-2010-5678', 'Mon-Wed-Fri 10AM-4PM',  'Joint replacement and sports injury specialist.',                        'MediCare@Vikram8934'),
('Dr. Meera Joshi',      'Dermatologist',      '9876543215', 'meera.joshi@medicare.demo',      650,  'MBBS, MD (Dermatology)',    8,  'MCI-KA-2016-6789', 'Mon-Sat 11AM-5PM',      'Expert in cosmetic dermatology and skin cancer screening.',              'MediCare@Meera2456'),
('Dr. Arjun Kulkarni',   'General Physician',  '9876543216', 'arjun.kulkarni@medicare.demo',   500,  'MBBS, MD (General)',        6,  'MCI-KA-2018-7890', 'Mon-Sat 8AM-12PM',      'Primary care physician focused on preventive medicine.',                 'MediCare@Arjun5678'),
('Dr. Sunita Hegde',     'ENT Specialist',     '9876543217', 'sunita.hegde@medicare.demo',     700,  'MBBS, MS (ENT)',            11, 'MCI-KA-2013-8901', 'Tue-Thu-Sat 10AM-3PM',  'Expert in sinus surgery and hearing disorders.',                         'MediCare@Sunita1234'),
('Dr. Ravi Kumar',       'Psychiatrist',       '9876543218', 'ravi.kumar@medicare.demo',       1000, 'MBBS, MD (Psychiatry)',     20, 'MCI-KA-2004-9012', 'Mon-Fri 2PM-6PM',       'Specializes in anxiety, depression and addiction psychiatry.',           'MediCare@Ravi9012'),
('Dr. Deepa Menon',      'Radiologist',        '9876543219', 'deepa.menon@medicare.demo',      850,  'MBBS, MD (Radiology)',      13, 'MCI-KA-2011-0123', 'Mon-Fri 9AM-5PM',       'Diagnostic imaging specialist with expertise in MRI and CT.',            'MediCare@Deepa3456')
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════
-- SECTION F: SAMPLE DATA — 20 Patients
-- ══════════════════════════════════════════════════

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
-- SECTION G: SAMPLE DATA — Pharmacy Inventory (30 Medicines)
-- ══════════════════════════════════════════════════

INSERT INTO pharmacy_inventory (medicine_name, generic_name, category, stock_quantity, unit_price, expiry_date, manufacturer) VALUES
('Paracetamol 500mg',     'Acetaminophen',        'Analgesic',        500, 5,    '2027-06-30', 'Cipla'),
('Amoxicillin 250mg',     'Amoxicillin',          'Antibiotic',       200, 12,   '2026-12-31', 'Sun Pharma'),
('Azithromycin 500mg',    'Azithromycin',         'Antibiotic',       150, 45,   '2027-03-15', 'Zydus'),
('Metformin 500mg',       'Metformin HCl',        'Anti-diabetic',    300, 8,    '2027-09-30', 'USV Pharma'),
('Amlodipine 5mg',        'Amlodipine Besylate',  'Antihypertensive', 400, 10,   '2027-08-15', 'Torrent'),
('Omeprazole 20mg',       'Omeprazole',           'Antacid',          350, 7,    '2027-05-31', 'Dr Reddys'),
('Cetirizine 10mg',       'Cetirizine HCl',       'Antihistamine',    600, 4,    '2027-12-31', 'Cipla'),
('Ibuprofen 400mg',       'Ibuprofen',            'NSAID',            250, 6,    '2027-04-30', 'Mankind'),
('Atorvastatin 10mg',     'Atorvastatin',         'Statin',           180, 15,   '2027-07-31', 'Ranbaxy'),
('Pantoprazole 40mg',     'Pantoprazole',         'PPI',              300, 12,   '2027-11-30', 'Alkem'),
('Cough Syrup 100ml',     'Dextromethorphan',     'Cough Suppressant', 120, 55,  '2027-02-28', 'Dabur'),
('Vitamin D3 1000IU',     'Cholecalciferol',      'Supplement',       400, 8,    '2028-01-31', 'HealthKart'),
('Iron Folic Acid',       'Ferrous Sulphate',     'Supplement',       500, 5,    '2027-10-31', 'Alkem'),
('ORS Sachet',            'Electrolyte Mix',      'Rehydration',      800, 10,   '2028-06-30', 'FDC'),
('Multivitamin Tablet',   'Multivitamin',         'Supplement',       350, 12,   '2028-03-31', 'Abbott'),
('Diclofenac Gel 30g',    'Diclofenac',           'Topical NSAID',    150, 65,   '2027-08-31', 'Novartis'),
('Betadine Solution',     'Povidone Iodine',      'Antiseptic',       200, 45,   '2028-12-31', 'Win Medicare'),
('Dolo 650',              'Paracetamol',          'Analgesic',        400, 8,    '2027-06-30', 'Micro Labs'),
('Montelukast 10mg',      'Montelukast',          'Anti-asthmatic',   160, 18,   '2027-09-15', 'Sun Pharma'),
('Salbutamol Inhaler',    'Salbutamol',           'Bronchodilator',   80,  120,  '2027-05-31', 'Cipla'),
('Metoprolol 50mg',       'Metoprolol Tartrate',  'Beta Blocker',     200, 12,   '2027-11-30', 'Torrent'),
('Losartan 50mg',         'Losartan Potassium',   'ARB',              250, 14,   '2027-07-31', 'Hetero'),
('Ranitidine 150mg',      'Ranitidine HCl',       'H2 Blocker',      300, 6,    '2027-04-15', 'J B Chemicals'),
('Clindamycin 300mg',     'Clindamycin',          'Antibiotic',       100, 25,   '2027-08-31', 'Intas'),
('Fluconazole 150mg',     'Fluconazole',          'Antifungal',       120, 35,   '2027-10-15', 'Glenmark'),
('B-Complex Tablet',      'Vitamin B Complex',    'Supplement',       450, 6,    '2028-02-28', 'Abbott'),
('Calcium + D3 Tablet',   'Calcium Carbonate',    'Supplement',       300, 10,   '2028-05-31', 'Shelcal'),
('Domperidone 10mg',      'Domperidone',          'Antiemetic',       200, 5,    '2027-06-15', 'Dr Reddys'),
('Levothyroxine 50mcg',   'Levothyroxine',        'Thyroid',          5,   12,   '2027-03-31', 'Abbott'),
('Prednisolone 5mg',      'Prednisolone',         'Corticosteroid',   8,   8,    '2026-05-15', 'Cipla')
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════
-- SECTION H: SAMPLE DATA — Appointments (15)
-- ══════════════════════════════════════════════════

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, notes)
SELECT p.id, d.id, apt_date, apt_time, apt_status, apt_notes
FROM (VALUES
  ('Pavan Patil',    'Dr. Rajesh Sharma',    CURRENT_DATE,       '09:30'::TIME, 'scheduled', 'Routine cardiac check-up'),
  ('Sneha Kulkarni', 'Dr. Priya Nair',       CURRENT_DATE,       '10:00'::TIME, 'scheduled', 'Follow-up visit'),
  ('Rahul Desai',    'Dr. Arjun Kulkarni',   CURRENT_DATE,       '10:30'::TIME, 'scheduled', 'Blood sugar review'),
  ('Mohd. Imran',    'Dr. Rajesh Sharma',    CURRENT_DATE,       '11:00'::TIME, 'scheduled', 'BP monitoring'),
  ('Arun Kumar',     'Dr. Rajesh Sharma',    CURRENT_DATE,       '14:00'::TIME, 'scheduled', 'Heart condition follow-up'),
  ('Pooja Jain',     'Dr. Meera Joshi',      CURRENT_DATE,       '11:30'::TIME, 'scheduled', 'Skin rash consultation'),
  ('Sunil Nair',     'Dr. Suresh Patil',     CURRENT_DATE - 1,   '09:00'::TIME, 'completed', 'Migraine evaluation done'),
  ('Kavitha Reddy',  'Dr. Anita Desai',      CURRENT_DATE - 1,   '10:00'::TIME, 'completed', 'Vaccination completed'),
  ('Meena Iyer',     'Dr. Priya Nair',       CURRENT_DATE - 2,   '11:00'::TIME, 'completed', 'Annual check-up'),
  ('Lakshmi Devi',   'Dr. Sunita Hegde',     CURRENT_DATE - 2,   '09:30'::TIME, 'completed', 'Hearing test done'),
  ('Ganesh Bhat',    'Dr. Meera Joshi',      CURRENT_DATE - 3,   '14:00'::TIME, 'completed', 'Eczema treatment reviewed'),
  ('Rajan Patil',    'Dr. Vikram Reddy',     CURRENT_DATE + 1,   '10:00'::TIME, 'scheduled', 'Knee pain evaluation'),
  ('Nisha Gupta',    'Dr. Arjun Kulkarni',   CURRENT_DATE + 1,   '11:00'::TIME, 'scheduled', 'General check-up'),
  ('Sanjay Verma',   'Dr. Suresh Patil',     CURRENT_DATE + 2,   '14:30'::TIME, 'scheduled', 'Migraine follow-up'),
  ('Anjali Sharma',  'Dr. Ravi Kumar',       CURRENT_DATE - 4,   '15:00'::TIME, 'cancelled', 'Patient cancelled')
) AS v(p_name, d_name, apt_date, apt_time, apt_status, apt_notes)
JOIN patients p ON p.name = v.p_name
JOIN doctors d ON d.name = v.d_name;


-- ══════════════════════════════════════════════════
-- SECTION I: SAMPLE DATA — Billing (10)
-- ══════════════════════════════════════════════════

INSERT INTO billing (patient_id, total_amount, paid_amount, payment_status, payment_method, items, notes)
SELECT p.id, v.total, v.paid, v.status, v.method, v.items::JSONB, v.bill_notes
FROM (VALUES
  ('Sunil Nair',     1200, 1200, 'paid',    'Cash',        '[{"description":"Consultation - Dr. Suresh Patil","amount":900},{"description":"Cetirizine 10mg x 10","amount":40},{"description":"Paracetamol 500mg x 20","amount":100},{"description":"Lab - Blood Test","amount":160}]', 'Migraine treatment bill'),
  ('Kavitha Reddy',  600,  600,  'paid',    'UPI',         '[{"description":"Consultation - Dr. Anita Desai","amount":600}]',                                                                                          'Vaccination visit'),
  ('Meena Iyer',     1350, 1350, 'paid',    'Card',        '[{"description":"Consultation - Dr. Priya Nair","amount":700},{"description":"Lab - CBC","amount":350},{"description":"Multivitamin x 30","amount":300}]',   'Annual check-up'),
  ('Lakshmi Devi',   850,  500,  'partial', 'Cash',        '[{"description":"Consultation - Dr. Sunita Hegde","amount":700},{"description":"Ear drops","amount":150}]',                                                 'Hearing test - partial payment'),
  ('Ganesh Bhat',    1100, 0,    'pending', NULL,          '[{"description":"Consultation - Dr. Meera Joshi","amount":650},{"description":"Diclofenac Gel x 2","amount":130},{"description":"Betadine Solution","amount":45},{"description":"Prednisolone 5mg x 30","amount":240}]', 'Eczema treatment pending'),
  ('Pavan Patil',    800,  0,    'pending', NULL,          '[{"description":"Consultation - Dr. Rajesh Sharma","amount":800}]',                                                                                          'Cardiac check-up pending'),
  ('Sneha Kulkarni', 1400, 700,  'partial', 'UPI',         '[{"description":"Consultation - Dr. Priya Nair","amount":700},{"description":"Salbutamol Inhaler","amount":120},{"description":"Montelukast x 30","amount":540}]', 'Asthma management'),
  ('Rahul Desai',    680,  680,  'paid',    'Net Banking', '[{"description":"Consultation - Dr. Arjun Kulkarni","amount":500},{"description":"Metformin 500mg x 60","amount":180}]',                                      'Diabetes follow-up'),
  ('Mohd. Imran',    960,  960,  'paid',    'Cash',        '[{"description":"Consultation - Dr. Rajesh Sharma","amount":800},{"description":"Amlodipine 5mg x 30","amount":100},{"description":"Losartan 50mg x 30","amount":60}]', 'BP management'),
  ('Prakash Hegde',  1500, 500,  'partial', 'Cash',        '[{"description":"Consultation - Dr. Arjun Kulkarni","amount":500},{"description":"Salbutamol Inhaler","amount":120},{"description":"Lab - Chest X-Ray","amount":400},{"description":"Lab - Pulmonary Function","amount":480}]', 'COPD follow-up')
) AS v(p_name, total, paid, status, method, items, bill_notes)
JOIN patients p ON p.name = v.p_name;


-- ══════════════════════════════════════════════════
-- SECTION J: SAMPLE DATA — Lab Reports (8)
-- ══════════════════════════════════════════════════

INSERT INTO lab_reports (patient_id, doctor_id, test_name, test_date, result, status, notes)
SELECT p.id, d.id, v.test, v.tdate, v.result, v.tstatus, v.tnotes
FROM (VALUES
  ('Sunil Nair',     'Dr. Suresh Patil',   'Complete Blood Count',   CURRENT_DATE - 1,  'WBC: 7200, RBC: 4.8M, Hb: 14.2, Platelets: 250K', 'completed', 'All parameters normal'),
  ('Meena Iyer',     'Dr. Priya Nair',     'CBC + ESR',              CURRENT_DATE - 2,  'WBC: 6800, RBC: 4.5M, Hb: 12.8, ESR: 15',         'completed', 'Slightly low Hb, advised iron supplements'),
  ('Rahul Desai',    'Dr. Arjun Kulkarni', 'HbA1c + Fasting Sugar',  CURRENT_DATE - 1,  'HbA1c: 7.2%, FBS: 142 mg/dL',                      'completed', 'Diabetes needs better control'),
  ('Prakash Hegde',  'Dr. Arjun Kulkarni', 'Chest X-Ray',            CURRENT_DATE - 3,  'Mild hyperinflation, no acute pathology',            'completed', 'Consistent with COPD'),
  ('Pavan Patil',    'Dr. Rajesh Sharma',  'ECG + Lipid Profile',    CURRENT_DATE,       NULL,                                                'pending',   'Ordered today'),
  ('Sneha Kulkarni', 'Dr. Priya Nair',     'Thyroid Profile',        CURRENT_DATE,       NULL,                                                'pending',   'Routine screening'),
  ('Mohd. Imran',    'Dr. Rajesh Sharma',  'Kidney Function Test',   CURRENT_DATE,       NULL,                                                'pending',   'Annual renal check'),
  ('Lakshmi Devi',   'Dr. Sunita Hegde',   'Pure Tone Audiometry',   CURRENT_DATE - 2,  'Mild sensorineural hearing loss - bilateral',        'completed', 'Hearing aid recommended')
) AS v(p_name, d_name, test, tdate, result, tstatus, tnotes)
JOIN patients p ON p.name = v.p_name
JOIN doctors d ON d.name = v.d_name;


-- ══════════════════════════════════════════════════
-- SECTION K: SAMPLE DATA — Prescriptions (5)
-- ══════════════════════════════════════════════════

INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, medicines, notes, rx_date)
SELECT p.id, d.id, v.diag, v.meds::JSONB, v.rx_notes, v.rdate
FROM (VALUES
  ('Sunil Nair',     'Dr. Suresh Patil',   'Chronic Migraine',
   '[{"name":"Paracetamol 500mg","dosage":"1 tablet BD","duration":"5 days","qty":10,"price":5},{"name":"Cetirizine 10mg","dosage":"1 tablet HS","duration":"7 days","qty":7,"price":4}]',
   'Avoid bright lights, rest well', CURRENT_DATE - 1),
  ('Rahul Desai',    'Dr. Arjun Kulkarni', 'Type 2 Diabetes - Uncontrolled',
   '[{"name":"Metformin 500mg","dosage":"1 tablet BD","duration":"30 days","qty":60,"price":8}]',
   'Strict diet control, monitor FBS weekly', CURRENT_DATE - 1),
  ('Sneha Kulkarni', 'Dr. Priya Nair',     'Bronchial Asthma',
   '[{"name":"Salbutamol Inhaler","dosage":"2 puffs SOS","duration":"30 days","qty":1,"price":120},{"name":"Montelukast 10mg","dosage":"1 tablet HS","duration":"30 days","qty":30,"price":18}]',
   'Use spacer with inhaler', CURRENT_DATE - 2),
  ('Mohd. Imran',    'Dr. Rajesh Sharma',  'Essential Hypertension',
   '[{"name":"Amlodipine 5mg","dosage":"1 tablet OD morning","duration":"30 days","qty":30,"price":10},{"name":"Losartan 50mg","dosage":"1 tablet OD","duration":"30 days","qty":30,"price":14}]',
   'Low salt diet, daily walk 30 mins', CURRENT_DATE - 1),
  ('Ganesh Bhat',    'Dr. Meera Joshi',    'Eczema - Moderate',
   '[{"name":"Diclofenac Gel 30g","dosage":"Apply BD on affected area","duration":"14 days","qty":2,"price":65},{"name":"Cetirizine 10mg","dosage":"1 tablet HS","duration":"14 days","qty":14,"price":4},{"name":"Prednisolone 5mg","dosage":"1 tablet OD","duration":"7 days","qty":7,"price":8}]',
   'Avoid soap on affected areas, use moisturizer', CURRENT_DATE - 3)
) AS v(p_name, d_name, diag, meds, rx_notes, rdate)
JOIN patients p ON p.name = v.p_name
JOIN doctors d ON d.name = v.d_name;


-- ══════════════════════════════════════════════════
-- SECTION L: SAMPLE DATA — Doctor Schedules
-- ══════════════════════════════════════════════════

INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_type, notes)
SELECT d.id, v.dow, v.st, v.et, v.stype, v.snotes
FROM (VALUES
  ('Dr. Rajesh Sharma',  'Monday',    '09:00'::TIME, '14:00'::TIME, 'available', NULL),
  ('Dr. Rajesh Sharma',  'Tuesday',   '09:00'::TIME, '14:00'::TIME, 'available', NULL),
  ('Dr. Rajesh Sharma',  'Wednesday', '09:00'::TIME, '14:00'::TIME, 'available', NULL),
  ('Dr. Rajesh Sharma',  'Thursday',  '09:00'::TIME, '14:00'::TIME, 'available', NULL),
  ('Dr. Rajesh Sharma',  'Friday',    '09:00'::TIME, '14:00'::TIME, 'available', NULL),
  ('Dr. Rajesh Sharma',  'Monday',    '13:00'::TIME, '14:00'::TIME, 'break',     'Lunch break'),
  ('Dr. Priya Nair',     'Monday',    '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Priya Nair',     'Tuesday',   '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Priya Nair',     'Wednesday', '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Priya Nair',     'Thursday',  '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Priya Nair',     'Friday',    '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Priya Nair',     'Saturday',  '10:00'::TIME, '14:00'::TIME, 'available', 'Half day'),
  ('Dr. Arjun Kulkarni', 'Monday',    '08:00'::TIME, '12:00'::TIME, 'available', NULL),
  ('Dr. Arjun Kulkarni', 'Tuesday',   '08:00'::TIME, '12:00'::TIME, 'available', NULL),
  ('Dr. Arjun Kulkarni', 'Wednesday', '08:00'::TIME, '12:00'::TIME, 'available', NULL),
  ('Dr. Arjun Kulkarni', 'Thursday',  '08:00'::TIME, '12:00'::TIME, 'available', NULL),
  ('Dr. Arjun Kulkarni', 'Friday',    '08:00'::TIME, '12:00'::TIME, 'available', NULL),
  ('Dr. Arjun Kulkarni', 'Saturday',  '08:00'::TIME, '12:00'::TIME, 'available', NULL),
  ('Dr. Suresh Patil',   'Tuesday',   '11:00'::TIME, '15:00'::TIME, 'available', NULL),
  ('Dr. Suresh Patil',   'Wednesday', '11:00'::TIME, '15:00'::TIME, 'available', NULL),
  ('Dr. Suresh Patil',   'Thursday',  '11:00'::TIME, '15:00'::TIME, 'available', NULL),
  ('Dr. Suresh Patil',   'Friday',    '11:00'::TIME, '15:00'::TIME, 'available', NULL),
  ('Dr. Suresh Patil',   'Saturday',  '11:00'::TIME, '15:00'::TIME, 'available', NULL),
  ('Dr. Meera Joshi',    'Monday',    '11:00'::TIME, '17:00'::TIME, 'available', NULL),
  ('Dr. Meera Joshi',    'Tuesday',   '11:00'::TIME, '17:00'::TIME, 'available', NULL),
  ('Dr. Meera Joshi',    'Wednesday', '11:00'::TIME, '17:00'::TIME, 'available', NULL),
  ('Dr. Meera Joshi',    'Thursday',  '11:00'::TIME, '17:00'::TIME, 'available', NULL),
  ('Dr. Meera Joshi',    'Friday',    '11:00'::TIME, '17:00'::TIME, 'available', NULL),
  ('Dr. Meera Joshi',    'Saturday',  '11:00'::TIME, '17:00'::TIME, 'available', NULL),
  ('Dr. Ravi Kumar',     'Monday',    '14:00'::TIME, '18:00'::TIME, 'available', NULL),
  ('Dr. Ravi Kumar',     'Tuesday',   '14:00'::TIME, '18:00'::TIME, 'available', NULL),
  ('Dr. Ravi Kumar',     'Wednesday', '14:00'::TIME, '18:00'::TIME, 'available', NULL),
  ('Dr. Ravi Kumar',     'Thursday',  '14:00'::TIME, '18:00'::TIME, 'available', NULL),
  ('Dr. Ravi Kumar',     'Friday',    '14:00'::TIME, '18:00'::TIME, 'available', NULL),
  ('Dr. Vikram Reddy',   'Monday',    '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Vikram Reddy',   'Wednesday', '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Vikram Reddy',   'Friday',    '10:00'::TIME, '16:00'::TIME, 'available', NULL),
  ('Dr. Vikram Reddy',   'Sunday',    '10:00'::TIME, '16:00'::TIME, 'leave',     'Weekly off')
) AS v(d_name, dow, st, et, stype, snotes)
JOIN doctors d ON d.name = v.d_name;


-- ══════════════════════════════════════════════════
-- SECTION M: SAMPLE DATA — Medical Records (6)
-- ══════════════════════════════════════════════════

INSERT INTO medical_records (patient_id, record_type, title, description, doctor_notes, record_date)
SELECT p.id, v.rtype, v.rtitle, v.rdesc, v.dnotes, v.rdate
FROM (VALUES
  ('Sunil Nair',    'visit',    'Migraine Consultation',     'Patient presented with severe headache lasting 3 days, photophobia.',         'Prescribed analgesics, advised neuroimaging if recurrent.',  CURRENT_DATE - 1),
  ('Rahul Desai',   'lab',      'HbA1c Test Result',         'HbA1c: 7.2% indicating poor glycemic control.',                              'Increased Metformin dosage, strict diet advised.',          CURRENT_DATE - 1),
  ('Arun Kumar',    'visit',    'Cardiac Follow-up',         'Patient with known CAD, stable angina on medication.',                        'Continue current medications, next echo in 3 months.',      CURRENT_DATE - 5),
  ('Ganesh Bhat',   'allergy',  'Latex Allergy Documented',  'Patient has documented latex allergy — causes contact dermatitis.',            'Use non-latex gloves for all procedures.',                  CURRENT_DATE - 10),
  ('Prakash Hegde', 'visit',    'COPD Exacerbation',         'Increased breathlessness and productive cough for 5 days.',                   'Nebulization done, oral steroids started.',                 CURRENT_DATE - 3),
  ('Kavitha Reddy', 'medicine', 'Vaccination Record',        'MMR booster vaccine administered. Batch: VX2026-0315.',                       'No adverse reaction observed. Next due in 10 years.',       CURRENT_DATE - 1)
) AS v(p_name, rtype, rtitle, rdesc, dnotes, rdate)
JOIN patients p ON p.name = v.p_name;


-- ══════════════════════════════════════════════════
-- ✅ SETUP COMPLETE!
-- 
-- Next steps:
-- 1. Go to Supabase Authentication → Settings → Disable email confirmations
-- 2. Create doctor auth accounts manually:
--    Authentication → Users → Add User
--    Use emails and passwords from the doctors table above
-- 3. Create one admin account by signing up through the app
--
-- To view doctor credentials:
-- SELECT name, email, login_password FROM doctors;
-- ══════════════════════════════════════════════════
