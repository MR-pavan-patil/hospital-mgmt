import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { Plus, Edit2, Trash2, FileText, Phone, Mail, MapPin, Droplets, AlertCircle, UserPlus, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Patients() {
  const { isAdmin } = useAuth()
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [historyModal, setHistoryModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [form, setForm] = useState({ name:'',dob:'',gender:'Male',phone:'',email:'',blood_group:'',address:'',emergency_contact:'',allergies:'',chronic_conditions:'',insurance_id:'',weight_kg:'',height_cm:'' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
    setPatients(data || [])
    setLoading(false)
  }

  const filtered = patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search) || p.email?.toLowerCase().includes(search.toLowerCase()))

  const getAge = (dob) => dob ? Math.floor((Date.now() - new Date(dob)) / 31557600000) : '—'

  function openAdd() { setForm({ name:'',dob:'',gender:'Male',phone:'',email:'',blood_group:'',address:'',emergency_contact:'',allergies:'',chronic_conditions:'',insurance_id:'',weight_kg:'',height_cm:'' }); setEditId(null); setModalOpen(true) }
  function openEdit(p) { setForm({...p}); setEditId(p.id); setModalOpen(true) }

  async function save() {
    setSaving(true)
    try {
      const payload = {...form}; delete payload.id; delete payload.created_at
      if (editId) { await supabase.from('patients').update(payload).eq('id', editId); toast.success('Patient updated') }
      else { await supabase.from('patients').insert(payload); toast.success('Patient added') }
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id) { if (!confirm('Delete?')) return; await supabase.from('patients').delete().eq('id', id); toast.success('Deleted'); load() }

  async function viewHistory(p) {
    setSelectedPatient(p)
    setHistoryModal(true)
  }

  if (loading) return <div className="space-y-3">{[...Array(6)].map((_,i)=><div key={i} className="skeleton h-16 rounded-2xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={24} className="text-blue-500" /> Patients</h1>
          <p className="text-sm text-gray-400 mt-1">{patients.length} total patients registered</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search patients..." /></div>
          <button onClick={openAdd} className="btn-primary"><UserPlus size={16}/> Add Patient</button>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="card-hover p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                  {p.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</h3>
                  <p className="text-xs text-gray-400">{getAge(p.dob)} yrs • {p.gender}</p>
                </div>
              </div>
              {p.blood_group && (
                <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg">
                  <Droplets size={10} /> {p.blood_group}
                </span>
              )}
            </div>

            <div className="space-y-1.5 mb-4">
              {p.phone && <p className="flex items-center gap-2 text-xs text-gray-500"><Phone size={12} className="text-gray-300" /> {p.phone}</p>}
              {p.email && <p className="flex items-center gap-2 text-xs text-gray-500 truncate"><Mail size={12} className="text-gray-300" /> {p.email}</p>}
              {p.address && <p className="flex items-center gap-2 text-xs text-gray-500 truncate"><MapPin size={12} className="text-gray-300" /> {p.address}</p>}
            </div>

            {(p.allergies || p.chronic_conditions) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.allergies && <span className="badge-danger text-[10px]"><AlertCircle size={9}/> {p.allergies}</span>}
                {p.chronic_conditions && <span className="badge-warning text-[10px]">{p.chronic_conditions}</span>}
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-dark-border">
              <button onClick={() => viewHistory(p)} className="btn-ghost flex-1 text-xs py-2"><FileText size={13}/> History</button>
              <button onClick={() => openEdit(p)} className="btn-ghost py-2"><Edit2 size={13}/></button>
              {isAdmin && <button onClick={() => remove(p.id)} className="btn-ghost py-2 text-red-400 hover:text-red-600"><Trash2 size={13}/></button>}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-gray-400 py-12">No patients found</p>}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Patient' : 'Add New Patient'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label:'Full Name', name:'name', required:true },
            { label:'Date of Birth', name:'dob', type:'date' },
            { label:'Phone', name:'phone' },
            { label:'Email', name:'email', type:'email' },
            { label:'Blood Group', name:'blood_group' },
            { label:'Address', name:'address' },
            { label:'Emergency Contact', name:'emergency_contact' },
            { label:'Insurance ID', name:'insurance_id' },
            { label:'Weight (kg)', name:'weight_kg', type:'number' },
            { label:'Height (cm)', name:'height_cm', type:'number' },
          ].map(f => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input type={f.type||'text'} value={form[f.name]||''} onChange={e => setForm({...form,[f.name]:e.target.value})} className="input" required={f.required} />
            </div>
          ))}
          <div>
            <label className="label">Gender</label>
            <select value={form.gender} onChange={e => setForm({...form,gender:e.target.value})} className="input">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div><label className="label">Allergies</label><input value={form.allergies||''} onChange={e => setForm({...form,allergies:e.target.value})} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Chronic Conditions</label><input value={form.chronic_conditions||''} onChange={e => setForm({...form,chronic_conditions:e.target.value})} className="input" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update Patient' : 'Add Patient'}</button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal open={historyModal} onClose={() => setHistoryModal(false)} title={`${selectedPatient?.name} — Medical Info`} size="md">
        {selectedPatient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[ ['Blood Group', selectedPatient.blood_group], ['Age', getAge(selectedPatient.dob)+' yrs'], ['Weight', selectedPatient.weight_kg ? selectedPatient.weight_kg+' kg' : '—'], ['Height', selectedPatient.height_cm ? selectedPatient.height_cm+' cm' : '—'] ].map(([k,v],i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                  <p className="text-xs text-gray-400 font-medium">{k}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{v || '—'}</p>
                </div>
              ))}
            </div>
            {selectedPatient.allergies && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10"><p className="text-xs font-bold text-red-600 mb-0.5">⚠ Allergies</p><p className="text-sm text-red-700 dark:text-red-300">{selectedPatient.allergies}</p></div>}
            {selectedPatient.chronic_conditions && <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10"><p className="text-xs font-bold text-amber-600 mb-0.5">Chronic Conditions</p><p className="text-sm text-amber-700 dark:text-amber-300">{selectedPatient.chronic_conditions}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  )
}
