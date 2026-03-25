import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SearchInput from '../components/ui/SearchInput'
import Modal from '../components/ui/Modal'
import { Plus, FileText, Activity, FlaskConical, Pill, AlertTriangle, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPES = ['visit','surgery','lab','medicine','allergy']
const TYPE_ICONS = { visit: Activity, surgery: FileText, lab: FlaskConical, medicine: Pill, allergy: AlertTriangle }
const TYPE_COLORS = { visit:'text-primary-600 bg-primary-50 dark:bg-primary-500/10', surgery:'text-red-600 bg-red-50 dark:bg-red-500/10', lab:'text-violet-600 bg-violet-50 dark:bg-violet-500/10', medicine:'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10', allergy:'text-amber-600 bg-amber-50 dark:bg-amber-500/10' }

export default function MedicalHistory() {
  const [records, setRecords] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ patient_id:'', record_type:'visit', title:'', description:'', doctor_notes:'', record_date:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [rRes, pRes] = await Promise.all([
      supabase.from('medical_records').select('*, patients(name)').order('record_date', { ascending: false }),
      supabase.from('patients').select('id, name'),
    ])
    setRecords(rRes.data || []); setPatients(pRes.data || [])
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const matchPatient = !selectedPatient || r.patient_id === selectedPatient
    const matchType = !typeFilter || r.record_type === typeFilter
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.patients?.name?.toLowerCase().includes(search.toLowerCase())
    return matchPatient && matchType && matchSearch
  })

  function openAdd() {
    setForm({ patient_id: selectedPatient || '', record_type:'visit', title:'', description:'', doctor_notes:'', record_date: new Date().toISOString().split('T')[0] })
    setModalOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      await supabase.from('medical_records').insert(form)
      toast.success('Record added')
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList size={24} className="text-rose-500" /> Medical History</h1>
          <p className="text-sm text-gray-400 mt-1">{records.length} records</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="input w-48">
            <option value="">All Patients</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-36">
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
          <button onClick={openAdd} className="btn-primary"><Plus size={16}/> Add Record</button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-dark-border" />
        <div className="space-y-4">
          {filtered.map(r => {
            const Icon = TYPE_ICONS[r.record_type] || FileText
            return (
              <div key={r.id} className="relative pl-14">
                <div className={`absolute left-3 top-4 w-7 h-7 rounded-full flex items-center justify-center ${TYPE_COLORS[r.record_type]} border-2 border-white dark:border-dark-card z-10`}>
                  <Icon size={12} />
                </div>
                <div className="card p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{r.title}</h4>
                      <p className="text-xs text-gray-500">{r.patients?.name} • {new Date(r.record_date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`badge capitalize ${TYPE_COLORS[r.record_type]?.replace('bg-','badge-') || 'badge-info'}`}>{r.record_type}</span>
                  </div>
                  {r.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{r.description}</p>}
                  {r.doctor_notes && <p className="text-sm text-primary-600 dark:text-primary-400 mt-1 italic">⁕ {r.doctor_notes}</p>}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="text-center text-gray-400 py-12 pl-14">No medical records found</div>}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Medical Record" size="md">
        <div className="space-y-4">
          <div><label className="label">Patient</label><select value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})} className="input"><option value="">Select</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Type</label><select value={form.record_type} onChange={e => setForm({...form,record_type:e.target.value})} className="input">{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="label">Date</label><input type="date" value={form.record_date} onChange={e => setForm({...form,record_date:e.target.value})} className="input" /></div>
          </div>
          <div><label className="label">Title</label><input value={form.title} onChange={e => setForm({...form,title:e.target.value})} className="input" required /></div>
          <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} className="input" rows={3} /></div>
          <div><label className="label">Doctor Notes</label><textarea value={form.doctor_notes} onChange={e => setForm({...form,doctor_notes:e.target.value})} className="input" rows={2} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Record'}</button>
        </div>
      </Modal>
    </div>
  )
}
