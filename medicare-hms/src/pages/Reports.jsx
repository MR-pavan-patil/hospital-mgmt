import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line } from 'recharts'
import { TrendingUp, Users, CalendarDays, Stethoscope, BarChart3 } from 'lucide-react'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316']

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState([])
  const [doctorPerf, setDoctorPerf] = useState([])
  const [deptData, setDeptData] = useState([])
  const [monthlyAppts, setMonthlyAppts] = useState([])
  const [summary, setSummary] = useState({ totalRevenue:0, totalPatients:0, totalAppts:0, avgBill:0 })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [bRes, pRes, aRes, dRes] = await Promise.all([
        supabase.from('billing').select('total_amount, paid_amount, created_at'),
        supabase.from('patients').select('id, gender, created_at'),
        supabase.from('appointments').select('id, doctor_id, appointment_date, status, doctors(name, specialization)'),
        supabase.from('doctors').select('id, name, specialization, fee'),
      ])

      const bills = bRes.data || []
      const patients = pRes.data || []
      const appts = aRes.data || []
      const docs = dRes.data || []

      // Summary
      const totalRevenue = bills.reduce((s,b)=>s+Number(b.paid_amount),0)
      const avgBill = bills.length ? Math.round(totalRevenue/bills.length) : 0
      setSummary({ totalRevenue, totalPatients: patients.length, totalAppts: appts.length, avgBill })

      // Monthly revenue (last 6 months)
      const months = []
      for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth()-i); months.push({ name: d.toLocaleString('default',{month:'short',year:'2-digit'}), revenue:0, appts:0 }) }
      bills.forEach(b => {
        const key = new Date(b.created_at).toLocaleString('default',{month:'short',year:'2-digit'})
        const m = months.find(x=>x.name===key)
        if (m) m.revenue += Number(b.paid_amount)
      })
      appts.forEach(a => {
        const key = new Date(a.appointment_date).toLocaleString('default',{month:'short',year:'2-digit'})
        const m = months.find(x=>x.name===key)
        if (m) m.appts++
      })
      setRevenueData(months)
      setMonthlyAppts(months)

      // Doctor performance
      const perfMap = {}
      docs.forEach(d => { perfMap[d.id] = { name: d.name, appointments:0, completed:0 } })
      appts.forEach(a => {
        if (perfMap[a.doctor_id]) {
          perfMap[a.doctor_id].appointments++
          if (a.status==='completed') perfMap[a.doctor_id].completed++
        }
      })
      setDoctorPerf(Object.values(perfMap).sort((a,b)=>b.appointments-a.appointments).slice(0,8))

      // Department distribution
      const deptMap = {}
      appts.forEach(a => {
        const dept = a.doctors?.specialization || 'Unknown'
        deptMap[dept] = (deptMap[dept]||0) + 1
      })
      setDeptData(Object.entries(deptMap).map(([name,value])=>({name,value})))

    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-72 rounded-2xl"/>)}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2"><BarChart3 size={24} className="text-orange-500" /> Reports & Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Hospital performance insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label:'Total Revenue', value:`₹${summary.totalRevenue.toLocaleString()}`, color:'from-emerald-500 to-teal-600', shadow:'shadow-emerald-500/20' },
          { icon: Users, label:'Total Patients', value:summary.totalPatients, color:'from-blue-500 to-blue-600', shadow:'shadow-blue-500/20' },
          { icon: CalendarDays, label:'Total Appointments', value:summary.totalAppts, color:'from-amber-500 to-orange-500', shadow:'shadow-amber-500/20' },
          { icon: Stethoscope, label:'Avg Bill Value', value:`₹${summary.avgBill}`, color:'from-violet-500 to-purple-600', shadow:'shadow-violet-500/20' },
        ].map((s,i) => (
          <div key={i} className="card-hover p-5 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${s.color} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-500`} />
            <div className="relative">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} ${s.shadow} shadow-lg w-fit mb-3`}><s.icon size={18} className="text-white"/></div>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{fontSize:11}} stroke="#94a3b8" />
              <YAxis tick={{fontSize:11}} stroke="#94a3b8" />
              <Tooltip formatter={(v)=>[`₹${v.toLocaleString()}`,'Revenue']} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Appointment Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyAppts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{fontSize:11}} stroke="#94a3b8" />
              <YAxis tick={{fontSize:11}} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="appts" stroke="#10b981" strokeWidth={2} dot={{r:4}} name="Appointments" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Doctor Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={doctorPerf} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{fontSize:11}} stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize:10}} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="appointments" fill="#8b5cf6" radius={[0,4,4,0]} name="Total" />
              <Bar dataKey="completed" fill="#10b981" radius={[0,4,4,0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={deptData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                {deptData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
