import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, UserCog, CalendarDays, Receipt, FlaskConical,
  Pill, ClipboardList, CalendarClock, BarChart3, Menu, X, LogOut,
  Sun, Moon, Heart, FileText, Bell, Search, ChevronRight
} from 'lucide-react'

const adminMenu = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/doctors', icon: UserCog, label: 'Doctors' },
  { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
  { to: '/billing', icon: Receipt, label: 'Billing' },
  { to: '/lab-reports', icon: FlaskConical, label: 'Lab Reports' },
  { to: '/pharmacy', icon: Pill, label: 'Pharmacy' },
  { to: '/prescriptions', icon: ClipboardList, label: 'Prescriptions' },
  { to: '/doctor-schedule', icon: CalendarClock, label: 'Doctor Schedule' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

const doctorMenu = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
  { to: '/prescriptions', icon: ClipboardList, label: 'Prescriptions' },
  { to: '/medical-history', icon: FileText, label: 'Medical History' },
  { to: '/lab-reports', icon: FlaskConical, label: 'Lab Reports' },
  { to: '/doctor-schedule', icon: CalendarClock, label: 'Doctor Schedule' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const menu = profile?.role === 'doctor' ? doctorMenu : adminMenu

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-7 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-violet-600 flex items-center justify-center shadow-xl shadow-primary-500/30">
          <Heart size={22} className="text-white drop-shadow" />
        </div>
        <div>
          <h1 className="text-white font-display font-extrabold text-lg tracking-tight leading-none">MediCare</h1>
          <p className="text-primary-400 text-[10px] font-bold tracking-[0.3em] uppercase mt-0.5">HMS</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 mt-1 space-y-0.5 overflow-y-auto">
        {menu.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-300 group relative
              ${isActive
                ? 'bg-gradient-to-r from-primary-500/20 to-violet-500/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary-400 to-violet-500 rounded-r-full" />}
                <item.icon size={18} className={`shrink-0 ${isActive ? 'text-primary-400' : 'group-hover:text-primary-400'} transition-colors`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-primary-400/50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Card */}
      <div className="px-3 pb-5 mt-auto">
        <div className="px-4 py-3.5 rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/20">
              {profile?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold truncate">{profile?.name || 'User'}</p>
              <p className="text-[11px] text-primary-400 capitalize font-medium">{profile?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[270px] flex-col bg-gradient-to-b from-sidebar via-sidebar to-[#0c1222] shrink-0 border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[270px] bg-gradient-to-b from-sidebar to-[#0c1222] flex flex-col z-50 animate-slide-in shadow-2xl">
            <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-5 p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-[70px] bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-gray-100/80 dark:border-dark-border/50 flex items-center justify-between px-5 lg:px-7 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2.5 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-all">
              <Menu size={20} className="text-gray-600 dark:text-dark-muted" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm text-gray-400 dark:text-dark-muted">
                Welcome back, <span className="text-gray-900 dark:text-white font-bold">{profile?.name || 'User'}</span>
              </h2>
              <p className="text-[11px] text-gray-300 dark:text-gray-600 capitalize">{profile?.role} Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search Button */}
            <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-all group">
              <Search size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>
            {/* Notifications */}
            <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-all relative group">
              <Bell size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-dark-card" />
            </button>
            {/* Theme Toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-all group"
              title="Toggle theme"
            >
              {dark
                ? <Sun size={18} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
                : <Moon size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              }
            </button>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="ml-1 p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
