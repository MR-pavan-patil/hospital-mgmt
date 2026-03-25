import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Doctors from './pages/Doctors'
import Appointments from './pages/Appointments'
import Billing from './pages/Billing'
import LabReports from './pages/LabReports'
import Pharmacy from './pages/Pharmacy'
import Prescriptions from './pages/Prescriptions'
import DoctorSchedule from './pages/DoctorSchedule'
import Reports from './pages/Reports'
import MedicalHistory from './pages/MedicalHistory'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#1e293b', color: '#e2e8f0', fontSize: '14px', borderRadius: '12px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="billing" element={<Billing />} />
            <Route path="lab-reports" element={<LabReports />} />
            <Route path="pharmacy" element={<Pharmacy />} />
            <Route path="prescriptions" element={<Prescriptions />} />
            <Route path="doctor-schedule" element={<DoctorSchedule />} />
            <Route path="reports" element={<Reports />} />
            <Route path="medical-history" element={<MedicalHistory />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
