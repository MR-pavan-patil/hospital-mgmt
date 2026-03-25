# MediCare HMS — Hospital Management System

> **BCA Final Year Project** — A modern, full-stack Hospital Management System built with React.js, Tailwind CSS, and Supabase.

---

## ✨ Features

| Module | Description |
|---|---|
| 🏠 **Dashboard** | Real-time stats, revenue charts, appointment trends, gender distribution |
| 👥 **Patients** | Full CRUD, medical info, allergies, blood groups, card-based UI |
| 🩺 **Doctors** | Manage doctors, specialization-based gradients, login credentials |
| 📅 **Appointments** | Book/edit/cancel appointments, check-in to complete, status badges |
| 💰 **Billing** | Line-item invoicing, payment tracking (Cash/Card/UPI), pending dues |
| 💊 **Pharmacy** | Inventory management, dispense medicines, auto-billing, expiry alerts |
| 📋 **Prescriptions** | Prescription builder, pharmacy search, auto cost estimation |
| 🔬 **Lab Reports** | Create/manage lab tests, mark completed with results |
| 📂 **Medical History** | Timeline-based record system with visit/surgery/lab/medicine types |
| 🗓️ **Doctor Schedule** | Weekly schedule grid, available/break/leave slot management |
| 📊 **Reports** | Revenue trends, doctor performance, department distribution charts |
| 🔐 **Auth** | Supabase Auth with admin signup + doctor auto-registration |

---

## 🛠️ Tech Stack

- **Frontend:** React.js 18 + Vite
- **Styling:** Tailwind CSS 3
- **Backend/DB:** Supabase (PostgreSQL + Auth)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Routing:** React Router DOM v6

---

## 📦 Requirements

Make sure you have the following installed:

- **Node.js** — v18 or higher → [Download](https://nodejs.org/)
- **npm** — v9 or higher (comes with Node.js)
- **Git** — [Download](https://git-scm.com/)
- **Supabase Account** — [Sign up free](https://supabase.com/)

---

## 🚀 How to Run This Project

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd hospital-mgmt/medicare-hms
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Supabase

1. Go to [supabase.com](https://supabase.com/) and create a new project.
2. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon public key`
3. Open `src/lib/supabase.js` and update:

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
```

### Step 4: Set Up Database

1. In Supabase Dashboard, go to **SQL Editor**
2. Run the SQL from `SQL_SCHEMA.sql` (creates all tables)
3. Then run `SQL_SCHEMA_UPDATE.sql` (adds additional features)

### Step 5: Start the Development Server

```bash
npm run dev
```

The app will start at **http://localhost:5173**

### Step 6: Create Admin Account

1. Open the app in browser
2. Click **"Sign Up"** tab
3. Enter email + password to create an admin account
4. Login with those credentials

### Step 7: Add Doctors

1. Go to **Doctors** → **Add Doctor**
2. Fill in the form (email, name, etc.)
3. A **login password** is auto-generated
4. Doctors can login directly using their email + auto-generated password

---

## 📁 Project Structure

```
medicare-hms/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout.jsx          # Sidebar + Header layout
│   │   ├── ProtectedRoute.jsx  # Auth guard
│   │   └── ui/
│   │       ├── Modal.jsx       # Reusable modal
│   │       ├── SearchInput.jsx # Search component
│   │       └── StatsCard.jsx   # Stats card component
│   ├── contexts/
│   │   └── AuthContext.jsx     # Auth state + doctor auto-register
│   ├── lib/
│   │   └── supabase.js         # Supabase client config
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Patients.jsx
│   │   ├── Doctors.jsx
│   │   ├── Appointments.jsx
│   │   ├── Billing.jsx
│   │   ├── Pharmacy.jsx
│   │   ├── Prescriptions.jsx
│   │   ├── LabReports.jsx
│   │   ├── MedicalHistory.jsx
│   │   ├── DoctorSchedule.jsx
│   │   ├── Reports.jsx
│   │   └── Login.jsx
│   ├── App.jsx
│   ├── index.css               # Tailwind + custom styles
│   └── main.jsx
├── SQL_SCHEMA.sql              # Database schema
├── SQL_SCHEMA_UPDATE.sql       # Schema updates
├── tailwind.config.js
├── vite.config.js
├── package.json
└── README.md
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | _(create via Sign Up)_ | _(your password)_ |
| Doctor | rajesh.sharma@medicare.demo | MediCare@Rajesh4521 |

---

## 📸 Screenshots

### Login Page
- Dark gradient background with glassmorphism
- Admin/Doctor tab switching
- Quick demo access buttons

### Dashboard
- Gradient stat cards with trend indicators
- Revenue area chart + Gender donut chart
- Today's appointments + Recent bills

### All Pages
- Every page has a colored icon in the header
- Description text showing item counts
- Premium card-based layouts
- Gradient badges and hover effects

---

## 🏗️ Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder. Deploy to any static hosting (Vercel, Netlify, etc.)

---

## 📝 License

This project is for educational purposes (BCA Final Year Project).

---

**Made with ❤️ by Pavan Patil**
