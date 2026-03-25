import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { Plus, Edit2, Trash2, CheckCircle2, FlaskConical } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LabReports() {
  const { isAdmin } = useAuth()
  const [reports, setReports] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', test_name:'', test_date:'', result:'', status:'pending', notes:'' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [rRes, pRes, dRes] = await Promise.all([
      supabase.from('lab_reports').select('*, patients(name), doctors(name)').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, name'),
      supabase.from('doctors').select('id, name'),
    ])
    setReports(rRes.data || []); setPatients(pRes.data || []); setDoctors(dRes.data || [])
    setLoading(false)
  }

  const filtered = reports.filter(r => {
    const matchSearch = r.test_name?.toLowerCase().includes(search.toLowerCase()) || r.patients?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchSearch && matchStatus
  })

  function openAdd() { setForm({ patient_id:'', doctor_id:'', test_name:'', test_date: new Date().toISOString().split('T')[0], result:'', status:'pending', notes:'' }); setEditId(null); setModalOpen(true) }
  function openEdit(r) { setForm({ patient_id:r.patient_id, doctor_id:r.doctor_id||'', test_name:r.test_name, test_date:r.test_date||'', result:r.result||'', status:r.status, notes:r.notes||'' }); setEditId(r.id); setModalOpen(true) }

  async function save() {
    setSaving(true)
    try {
      if (editId) {
        await supabase.from('lab_reports').update(form).eq('id', editId)
        toast.success('Report updated')
      } else {
        await supabase.from('lab_reports').insert(form)
        toast.success('Report created')
      }
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function markComplete(r) {
    const result = prompt('Enter test result:')
    if (!result) return
    await supabase.from('lab_reports').update({ status:'completed', result }).eq('id', r.id)
    toast.success('Report completed'); load()
  }

  async function remove(id) {
    if (!confirm('Delete this report?')) return
    await supabase.from('lab_reports').delete().eq('id', id)
    toast.success('Report deleted'); load()
  }

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-14 rounded-2xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FlaskConical size={24} className="text-violet-500" /> Lab Reports</h1>
          <p className="text-sm text-gray-400 mt-1">{reports.length} reports</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56"><SearchInput value={search} onChange={setSearch} placeholder="Search..." /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <button onClick={openAdd} className="btn-primary"><Plus size={16}/> Add Report</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-dark-bg">
              <tr>
                {['Date','Patient','Test','Referred By','Result','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-dark-border hover:bg-gray-50/50 dark:hover:bg-dark-border/30">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.test_date ? new Date(r.test_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.patients?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.test_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.doctors?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{r.result || '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${r.status==='completed'?'badge-success':'badge-warning'}`}>{r.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {r.status === 'pending' && <button onClick={() => markComplete(r)} className="btn-ghost p-1.5 text-emerald-600" title="Mark Complete"><CheckCircle2 size={15}/></button>}
                      <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Edit2 size={15}/></button>
                      {isAdmin && <button onClick={() => remove(r.id)} className="btn-ghost p-1.5 text-red-500"><Trash2 size={15}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No reports found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Lab Report' : 'New Lab Report'} size="md">
        <div className="space-y-4">
          <div><label className="label">Patient</label><select value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})} className="input"><option value="">Select</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="label">Referred By (Doctor)</label><select value={form.doctor_id} onChange={e => setForm({...form,doctor_id:e.target.value})} className="input"><option value="">Select</option>{doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Test Name</label><input value={form.test_name} onChange={e => setForm({...form,test_name:e.target.value})} className="input" required /></div>
            <div><label className="label">Test Date</label><input type="date" value={form.test_date} onChange={e => setForm({...form,test_date:e.target.value})} className="input" /></div>
          </div>
          <div><label className="label">Result</label><textarea value={form.result} onChange={e => setForm({...form,result:e.target.value})} className="input" rows={3} /></div>
          <div><label className="label">Status</label><select value={form.status} onChange={e => setForm({...form,status:e.target.value})} className="input"><option value="pending">Pending</option><option value="completed">Completed</option></select></div>
          <div><label className="label">Notes</label><textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} className="input" rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
        </div>
      </Modal>
    </div>
  )
}
