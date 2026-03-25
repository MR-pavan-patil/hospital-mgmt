import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Edit2, Trash2, Clock, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const COLORS = { available:'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400', break:'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400', leave:'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400' }

export default function DoctorSchedule() {
  const [schedules, setSchedules] = useState([])
  const [doctors, setDoctors] = useState([])
  const [selectedDoc, setSelectedDoc] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ doctor_id:'', day_of_week:'Monday', start_time:'09:00', end_time:'17:00', slot_type:'available', notes:'' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [sRes, dRes] = await Promise.all([
      supabase.from('doctor_schedules').select('*, doctors(name)').order('start_time'),
      supabase.from('doctors').select('id, name, specialization'),
    ])
    setSchedules(sRes.data || []); setDoctors(dRes.data || [])
    if (!selectedDoc && dRes.data?.length) setSelectedDoc(dRes.data[0].id)
    setLoading(false)
  }

  const docSchedules = schedules.filter(s => !selectedDoc || s.doctor_id === selectedDoc)

  function getSlots(day) { return docSchedules.filter(s => s.day_of_week === day) }

  function openAdd(day) {
    setForm({ doctor_id: selectedDoc, day_of_week: day || 'Monday', start_time:'09:00', end_time:'17:00', slot_type:'available', notes:'' })
    setEditId(null); setModalOpen(true)
  }

  function openEdit(s) {
    setForm({ doctor_id: s.doctor_id, day_of_week: s.day_of_week, start_time: s.start_time?.slice(0,5), end_time: s.end_time?.slice(0,5), slot_type: s.slot_type, notes: s.notes||'' })
    setEditId(s.id); setModalOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      if (editId) {
        await supabase.from('doctor_schedules').update(form).eq('id', editId)
        toast.success('Schedule updated')
      } else {
        await supabase.from('doctor_schedules').insert(form)
        toast.success('Schedule added')
      }
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this slot?')) return
    await supabase.from('doctor_schedules').delete().eq('id', id)
    toast.success('Deleted'); load()
  }

  if (loading) return <div className="skeleton h-96 rounded-2xl" />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Calendar size={24} className="text-cyan-500" /> Doctor Schedule</h1>
          <p className="text-sm text-gray-400 mt-1">Weekly schedule overview</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} className="input w-56">
            <option value="">All Doctors</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={() => openAdd()} className="btn-primary"><Plus size={16}/> Add Slot</button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 min-w-[700px]">
          {DAYS.map(day => (
            <div key={day} className="border-r border-gray-100 dark:border-dark-border last:border-r-0">
              <div className="px-3 py-2.5 bg-gray-50 dark:bg-dark-bg text-center border-b border-gray-100 dark:border-dark-border">
                <span className="text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase">{day.slice(0,3)}</span>
              </div>
              <div className="p-2 space-y-1.5 min-h-[200px]">
                {getSlots(day).map(s => (
                  <div key={s.id} className={`p-2 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-sm ${COLORS[s.slot_type]}`} onClick={() => openEdit(s)}>
                    <div className="flex items-center gap-1 font-medium">
                      <Clock size={10} /> {s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}
                    </div>
                    <p className="capitalize mt-0.5 opacity-80">{s.slot_type}</p>
                    {s.notes && <p className="mt-0.5 opacity-70 truncate">{s.notes}</p>}
                    <button onClick={e => { e.stopPropagation(); remove(s.id) }} className="mt-1 text-red-500 hover:text-red-700">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                <button onClick={() => openAdd(day)} className="w-full py-2 rounded-lg border-2 border-dashed border-gray-200 dark:border-dark-border text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-xs">
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Schedule' : 'Add Schedule'} size="sm">
        <div className="space-y-4">
          <div><label className="label">Doctor</label><select value={form.doctor_id} onChange={e => setForm({...form,doctor_id:e.target.value})} className="input"><option value="">Select</option>{doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label className="label">Day</label><select value={form.day_of_week} onChange={e => setForm({...form,day_of_week:e.target.value})} className="input">{DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start</label><input type="time" value={form.start_time} onChange={e => setForm({...form,start_time:e.target.value})} className="input" /></div>
            <div><label className="label">End</label><input type="time" value={form.end_time} onChange={e => setForm({...form,end_time:e.target.value})} className="input" /></div>
          </div>
          <div><label className="label">Type</label><select value={form.slot_type} onChange={e => setForm({...form,slot_type:e.target.value})} className="input"><option value="available">Available</option><option value="break">Break</option><option value="leave">Leave</option></select></div>
          <div><label className="label">Notes</label><input value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} className="input" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update' : 'Add'}</button>
        </div>
      </Modal>
    </div>
  )
}
