import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { Plus, Edit2, Trash2, CheckCircle2, ClipboardList, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Appointments() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [appts, setAppts] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', appointment_date:'', appointment_time:'', status:'scheduled', notes:'' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const perPage = 15

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [aRes, pRes, dRes] = await Promise.all([
      supabase.from('appointments').select('*, patients(name), doctors(name, specialization)').order('appointment_date', { ascending: false }),
      supabase.from('patients').select('id, name'),
      supabase.from('doctors').select('id, name, specialization'),
    ])
    setAppts(aRes.data || []); setPatients(pRes.data || []); setDoctors(dRes.data || [])
    setLoading(false)
  }

  const filtered = appts.filter(a => {
    const matchSearch = a.patients?.name?.toLowerCase().includes(search.toLowerCase()) || a.doctors?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || a.status === statusFilter
    return matchSearch && matchStatus
  })
  const paged = filtered.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  function openAdd() { setForm({ patient_id:'', doctor_id:'', appointment_date:'', appointment_time:'', status:'scheduled', notes:'' }); setEditId(null); setModalOpen(true) }
  function openEdit(a) { setForm({ patient_id:a.patient_id, doctor_id:a.doctor_id, appointment_date:a.appointment_date, appointment_time:a.appointment_time||'', status:a.status, notes:a.notes||'' }); setEditId(a.id); setModalOpen(true) }

  async function save() {
    setSaving(true)
    try {
      if (editId) {
        const { error } = await supabase.from('appointments').update(form).eq('id', editId)
        if (error) throw error
        toast.success('Appointment updated')
      } else {
        const { error } = await supabase.from('appointments').insert(form)
        if (error) throw error
        toast.success('Appointment booked')
      }
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function checkIn(a) {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', a.id)
    toast.success('Appointment completed!')
    const openRx = confirm('Open Prescription Builder?')
    if (openRx) navigate('/prescriptions', { state: { patient_id: a.patient_id, doctor_id: a.doctor_id } })
    load()
  }

  async function remove(id) {
    if (!confirm('Delete this appointment?')) return
    await supabase.from('appointments').delete().eq('id', id)
    toast.success('Appointment deleted'); load()
  }

  const statusBadge = (s) => ({ scheduled:'badge-warning', completed:'badge-success', cancelled:'badge-danger' }[s] || 'badge-info')

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><CalendarDays size={24} className="text-amber-500" /> Appointments</h1>
          <p className="text-sm text-gray-400 mt-1">{appts.length} total appointments</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-56"><SearchInput value={search} onChange={setSearch} placeholder="Search..." /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36">
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={openAdd} className="btn-primary"><Plus size={16}/> Book Appointment</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-dark-bg">
              <tr>
                {['Date','Time','Patient','Doctor','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(a => (
                <tr key={a.id} className="border-t border-gray-100 dark:border-dark-border hover:bg-gray-50/50 dark:hover:bg-dark-border/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{new Date(a.appointment_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.appointment_time?.slice(0,5) || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.patients?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 dark:text-gray-300">{a.doctors?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{a.doctors?.specialization || ''}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${statusBadge(a.status)}`}>{a.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {a.status === 'scheduled' && (
                        <button onClick={() => checkIn(a)} className="btn-ghost p-1.5 text-emerald-600" title="Check-In (Complete)"><CheckCircle2 size={16}/></button>
                      )}
                      <button onClick={() => openEdit(a)} className="btn-ghost p-1.5"><Edit2 size={15}/></button>
                      {isAdmin && <button onClick={() => remove(a.id)} className="btn-ghost p-1.5 text-red-500"><Trash2 size={15}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No appointments found</td></tr>}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-border">
            <span className="text-sm text-gray-500">{filtered.length} appointment(s)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0} className="btn-ghost p-1.5"><ChevronLeft size={16}/></button>
              <span className="text-sm text-gray-600 dark:text-gray-300">{page+1} / {totalPages}</span>
              <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} className="btn-ghost p-1.5"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Appointment' : 'Book Appointment'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Patient</label>
            <select value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})} className="input" required>
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Doctor</label>
            <select value={form.doctor_id} onChange={e => setForm({...form,doctor_id:e.target.value})} className="input" required>
              <option value="">Select Doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.appointment_date} onChange={e => setForm({...form,appointment_date:e.target.value})} className="input" required />
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" value={form.appointment_time} onChange={e => setForm({...form,appointment_time:e.target.value})} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={e => setForm({...form,status:e.target.value})} className="input">
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} className="input" rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update' : 'Book'}</button>
        </div>
      </Modal>
    </div>
  )
}
