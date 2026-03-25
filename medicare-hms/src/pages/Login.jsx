import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Heart, Mail, Lock, User, Eye, EyeOff, Stethoscope, Shield, ArrowRight, Sparkles, Activity, Zap, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [tab, setTab] = useState('admin')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password, name)
        toast.success('Account created! Please log in.')
        setIsSignUp(false)
      } else {
        await signIn(email, password)
        toast.success('Welcome to MediCare HMS!')
        navigate('/')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const demoLogin = async (demoEmail, demoPass) => {
    setLoading(true)
    try {
      await signIn(demoEmail, demoPass)
      toast.success('Welcome to MediCare HMS!')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Demo login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0a0e27]">
      {/* LEFT — Hero Section */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center">
        {/* Gradient Blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/30 via-indigo-900/50 to-purple-900/40" />
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-violet-500/15 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '3s' }} />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '6s' }} />
        </div>

        {/* Dot Grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg px-12">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Heart size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Medi<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Care</span>
              </h1>
              <p className="text-xs text-blue-300/60 font-medium tracking-widest uppercase">Hospital Management</p>
            </div>
          </div>

          {/* Big Heading */}
          <h2 className="text-5xl font-extrabold text-white leading-[1.15] mb-6">
            Smart Healthcare,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
              Simplified.
            </span>
          </h2>

          <p className="text-blue-200/50 text-base leading-relaxed mb-10">
            Complete hospital management with patient tracking, doctor scheduling, pharmacy inventory, billing, and real-time analytics — all in one place.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users, label: 'Patient Records', desc: 'Complete profiles', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20' },
              { icon: Clock, label: 'Appointments', desc: 'Easy scheduling', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20' },
              { icon: Zap, label: 'Quick Billing', desc: 'Auto invoicing', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20' },
              { icon: Activity, label: 'Analytics', desc: 'Real-time data', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/20' },
            ].map((f, i) => (
              <div key={i} className={`bg-gradient-to-br ${f.color} border ${f.border} rounded-2xl p-4 backdrop-blur-sm`}>
                <f.icon size={20} className="text-white/80 mb-2" />
                <p className="text-white/90 text-sm font-semibold">{f.label}</p>
                <p className="text-white/40 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom Stats */}
          <div className="flex items-center gap-8 mt-10">
            <div>
              <p className="text-2xl font-extrabold text-white">12+</p>
              <p className="text-xs text-blue-300/50">Modules</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-2xl font-extrabold text-white">100%</p>
              <p className="text-xs text-blue-300/50">Secure</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-2xl font-extrabold text-white">24/7</p>
              <p className="text-xs text-blue-300/50">Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Form Section */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 relative">
        {/* Subtle Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-violet-500/5 rounded-full blur-[80px]" />

        <div className="relative z-10 w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 shadow-xl shadow-blue-500/30 mb-4">
              <Heart size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Medi<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Care</span>
            </h1>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Welcome Back</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-1">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-sm text-white/35">
              {isSignUp ? 'Register as a new admin' : 'Access your hospital dashboard'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/[0.04] rounded-2xl p-1 mb-6 border border-white/[0.06]">
            <button
              onClick={() => { setTab('admin'); setIsSignUp(false) }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                tab === 'admin'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Shield size={15} /> Admin
            </button>
            <button
              onClick={() => { setTab('doctor'); setIsSignUp(false) }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                tab === 'doctor'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Stethoscope size={15} /> Doctor
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. John Doe"
                    className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/15 focus:bg-white/[0.07] focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all duration-300 text-sm" required />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={tab === 'doctor' ? 'rajesh.sharma@medicare.demo' : 'admin@example.com'}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/15 focus:bg-white/[0.07] focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all duration-300 text-sm" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/15 focus:bg-white/[0.07] focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all duration-300 text-sm" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-xl shadow-blue-600/25 hover:shadow-2xl hover:shadow-blue-600/35 disabled:opacity-50 transition-all duration-300 text-sm flex items-center justify-center gap-2 active:scale-[0.98] mt-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Toggle */}
          {tab === 'admin' && (
            <p className="text-center text-sm text-white/30 mt-5">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 hover:text-blue-300 font-bold ml-1 transition-colors">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          )}

          {tab === 'doctor' && !isSignUp && (
            <p className="text-center text-xs text-white/20 mt-5 leading-relaxed">
              Use credentials provided by admin.<br />
              Doctors are auto-registered on first login.
            </p>
          )}

          {/* Demo Access */}
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <p className="text-[10px] text-white/25 text-center mb-3 font-bold uppercase tracking-[0.2em]">Quick Demo Access</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => demoLogin('admin@medicare.demo', 'Admin@1234')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-blue-500/30 text-white/50 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 group"
              >
                <Shield size={13} className="text-blue-400/60 group-hover:text-blue-400" /> Admin
              </button>
              <button
                onClick={() => demoLogin('rajesh.sharma@medicare.demo', 'MediCare@Rajesh4521')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-emerald-500/30 text-white/50 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 group"
              >
                <Stethoscope size={13} className="text-emerald-400/60 group-hover:text-emerald-400" /> Doctor
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-white/15 mt-8 tracking-wide">
            © 2026 MediCare HMS — BCA Final Year Project
          </p>
        </div>
      </div>
    </div>
  )
}
