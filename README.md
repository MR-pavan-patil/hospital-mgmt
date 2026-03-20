# 🏥 MediCare HMS — Hospital Management System

A full-featured Hospital Management System built with **Plain HTML/CSS/JS** + **Supabase** backend.

---

## 📁 Project Structure

```
hospital-mgmt/
├── index.html          ← Login / Register page
├── app.html            ← Main app (all modules)
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── config.js       ← ⚠️ Supabase config (edit this!)
│   ├── auth.js         ← Auth (login, signup, logout)
│   ├── app.js          ← Navigation, utilities
│   ├── dashboard.js    ← Dashboard stats
│   ├── patients.js     ← Patient management
│   ├── doctors.js      ← Doctor management
│   ├── appointments.js ← Appointment scheduling
│   ├── billing.js      ← Billing & payments
│   ├── lab.js          ← Lab reports
│   └── pharmacy.js     ← Pharmacy inventory
└── README.md
```

---

## ⚙️ Setup — Step by Step

### Step 1: Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Click **New Project** → give it a name like `hospital-mgmt`
3. Wait for it to initialize

### Step 2: Run SQL Schema
Go to **SQL Editor** in Supabase → New Query → paste and run this:

```sql
-- Profiles (extends Supabase auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin','doctor','receptionist','pharmacist','lab_technician')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  blood_group TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctors
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialization TEXT,
  phone TEXT,
  email TEXT,
  availability TEXT,
  fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  status TEXT CHECK (status IN ('scheduled','completed','cancelled')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing
CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('pending','partial','paid')) DEFAULT 'pending',
  payment_method TEXT,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Reports
CREATE TABLE lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  test_date DATE,
  result TEXT,
  status TEXT CHECK (status IN ('pending','completed')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pharmacy Inventory
CREATE TABLE pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name TEXT NOT NULL,
  category TEXT,
  stock_quantity INT DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  expiry_date DATE,
  manufacturer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 3: Set Row Level Security (RLS)
In Supabase → **Authentication → Policies**, for each table enable RLS and add:
- A policy that allows **authenticated users** to SELECT, INSERT, UPDATE, DELETE

Quick policy for development (run in SQL Editor):
```sql
-- Allow all authenticated users (adjust per role in production)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','patients','doctors','appointments','billing','lab_reports','pharmacy_inventory']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "auth_all_%I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
```

### Step 4: Get Your API Keys
Go to **Project Settings → API**:
- Copy **Project URL**
- Copy **anon / public** key

### Step 5: Configure the App
Open `js/config.js` and replace:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### Step 6: Run the App
Open `index.html` in a browser (use VS Code Live Server for best experience).

---

## 🔐 Authentication Flow
- **Register** a new admin account via the Sign Up tab
- **Login** with email/password
- Session is managed by Supabase automatically

---

## 🧩 Modules

| Module | Features |
|--------|----------|
| 📊 Dashboard | Stats overview + recent appointments |
| 🧑‍⚕️ Patients | Add / Edit / Delete / Search patients |
| 👨‍⚕️ Doctors | Manage doctors, specialization, fees |
| 📅 Appointments | Schedule, update status, link patient+doctor |
| 💰 Billing | Create bills, track payments, pending dues |
| 🧪 Lab Reports | Add test results, mark pending/completed |
| 💊 Pharmacy | Inventory management, low stock + expiry alerts |

---

## 🛠 Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL + Auth + REST API)
- **CDN**: Supabase JS v2 (from jsDelivr)

---

## 📝 Notes for Final Year Project
- This is a single-page application (SPA) with hash-based navigation
- All CRUD operations use Supabase REST API via JS client
- No backend server needed — runs fully in the browser
- Can be deployed on GitHub Pages, Netlify, or Vercel for free

---

Made with ❤️ for Final Year Project 2025
