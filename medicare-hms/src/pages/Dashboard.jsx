import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Users, UserCog, CalendarDays, IndianRupee, TrendingUp, TrendingDown, Activity, Clock, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899']

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ patients:0, doctors:0, todayAppts:0, pendingDues:0 })
  const [revenueData, setRevenueData] = useState([])
  const [genderData, setGenderData] = useState([])
  const [todayAppts, setTodayAppts] = useState([])
  const [recentBills, setRecentBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const today = new Date().toISOString().split('T')[0]
    const [pRes, dRes, aRes, bRes] = await Promise.all([
      supabase.from('patients').select('id, gender'),
      supabase.from('doctors').select('id'),
      supabase.from('appointments').select('*, patients(name), doctors(name, specialization)').gte('appointment_date', today).order('appointment_time'),
      supabase.from('billing').select('total_amount, paid_amount, payment_status, created_at, patients(name)').order('created_at', { ascending: false }).limit(5),
    ])

    const patients = pRes.data || []; const doctors = dRes.data || []
    const appts = aRes.data || []; const bills = bRes.data || []
    const pending = bills.reduce((s,b) => s + Math.max(0, Number(b.total_amount) - Number(b.paid_amount)), 0)

    setStats({ patients: patients.length, doctors: doctors.length, todayAppts: appts.filter(a => a.appointment_date === today).length, pendingDues: pending })
    setTodayAppts(appts.filter(a => a.appointment_date === today).slice(0, 6))
    setRecentBills(bills)

    // Gender
    const gc = { Male:0, Female:0, Other:0 }
    patients.forEach(p => { if (gc[p.gender] !== undefined) gc[p.gender]++ })
    setGenderData(Object.entries(gc).filter(([,v])=>v>0).map(([name,value])=>({name,value})))

    // Revenue (6 months)
    const months = []
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth()-i); months.push({ name: d.toLocaleString('default',{month:'short'}), revenue:0 }) }
    const { data: allBills } = await supabase.from('billing').select('paid_amount, created_at')
    ;(allBills||[]).forEach(b => {
      const key = new Date(b.created_at).toLocaleString('default',{month:'short'})
      const m = months.find(x=>x.name===key)
      if (m) m.revenue += Number(b.paid_amount)
    })
    setRevenueData(months)
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-32 rounded-2xl"/>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[...Array(2)].map((_,i)=><div key={i} className="skeleton h-72 rounded-2xl"/>)}</div>
    </div>
  )

  const statCards = [
    { icon: Users, label:'Total Patients', value: stats.patients, color:'from-blue-500 to-blue-600', shadow:'shadow-blue-500/20', trend:'+12%', trendUp:true },
    { icon: UserCog, label:'Total Doctors', value: stats.doctors, color:'from-emerald-500 to-teal-600', shadow:'shadow-emerald-500/20', trend:'+3', trendUp:true },
    { icon: CalendarDays, label:"Today's Appointments", value: stats.todayAppts, color:'from-amber-500 to-orange-500', shadow:'shadow-amber-500/20', trend:'Active', trendUp:true },
    { icon: IndianRupee, label:'Pending Dues', value: `₹${stats.pendingDues.toLocaleString()}`, color:'from-rose-500 to-pink-600', shadow:'shadow-rose-500/20', trend:'Collect', trendUp:false },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Overview of your hospital operations</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s, i) => (
          <div key={i} className="card-hover p-5 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${s.color} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-500`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} ${s.shadow} shadow-lg`}>
                  <s.icon size={18} className="text-white" />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.trendUp ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-600 bg-rose-50 dark:bg-rose-500/10'}`}>
                  {s.trend}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{s.value}</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted mt-1 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-blue-500" />
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Revenue (Last 6 Months)</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip formatter={v=>[`₹${v.toLocaleString()}`,'Revenue']} contentStyle={{borderRadius:'12px',border:'1px solid #e2e8f0',boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-violet-500" />
            <h3 className="font-display font-bold text-gray-900 dark:text-white">Gender Stats</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} strokeWidth={0}>
                {genderData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e2e8f0'}} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {genderData.map((g,i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{background:COLORS[i]}} />
                <span className="text-gray-500">{g.name}: <strong className="text-gray-700 dark:text-gray-300">{g.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Appointments */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Today's Appointments</h3>
            </div>
            <span className="badge-info">{stats.todayAppts} total</span>
          </div>
          <div className="space-y-2">
            {todayAppts.map(a => (
              <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50/80 dark:bg-dark-bg/50 hover:bg-gray-100/80 dark:hover:bg-dark-bg transition-colors">
                <span className="text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-500/10 px-2.5 py-1.5 rounded-lg whitespace-nowrap">{a.appointment_time?.slice(0,5)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{a.patients?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{a.doctors?.name} • {a.doctors?.specialization}</p>
                </div>
                <span className={`badge ${a.status === 'completed' ? 'badge-success' : a.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{a.status}</span>
              </div>
            ))}
            {todayAppts.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No appointments today</p>}
          </div>
        </div>

        {/* Recent Bills */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <IndianRupee size={18} className="text-emerald-500" />
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Recent Bills</h3>
            </div>
          </div>
          <div className="space-y-2">
            {recentBills.map((b, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50/80 dark:bg-dark-bg/50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">₹</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{b.patients?.name}</p>
                  <p className="text-xs text-gray-400">₹{Number(b.total_amount).toLocaleString()}</p>
                </div>
                <span className={`badge ${b.payment_status === 'paid' ? 'badge-success' : b.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>{b.payment_status}</span>
              </div>
            ))}
            {recentBills.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No recent bills</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
