import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { Plus, Edit2, Trash2, Stethoscope, Phone, Award, Clock, Star, Key, Copy, Check, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'

const SPEC_COLORS = {
  'Cardiologist':'from-rose-500 to-rose-600', 'Gynaecologist':'from-pink-500 to-pink-600', 'Neurologist':'from-violet-500 to-violet-600',
  'Paediatrician':'from-sky-500 to-sky-600', 'Orthopaedic':'from-amber-500 to-amber-600', 'Dermatologist':'from-teal-500 to-teal-600',
  'General Physician':'from-blue-500 to-blue-600', 'ENT Specialist':'from-cyan-500 to-cyan-600', 'Psychiatrist':'from-indigo-500 to-indigo-600',
  'Radiologist':'from-emerald-500 to-emerald-600'
}

export default function Doctors() {
  const { isAdmin } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [credModal, setCredModal] = useState(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name:'',specialization:'',phone:'',email:'',fee:0,qualification:'',experience_years:0,reg_number:'',availability:'',bio:'' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('doctors').select('*').order('name')
    setDoctors(data || [])
    setLoading(false)
  }

  const filtered = doctors.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()))

  function openAdd() { setForm({ name:'',specialization:'',phone:'',email:'',fee:0,qualification:'',experience_years:0,reg_number:'',availability:'',bio:'' }); setEditId(null); setModalOpen(true) }
  function openEdit(d) { setForm({...d}); setEditId(d.id); setModalOpen(true) }

  async function save() {
    setSaving(true)
    try {
      const payload = {...form, fee:Number(form.fee), experience_years:Number(form.experience_years)}
      delete payload.id; delete payload.created_at; delete payload.login_password
      if (!editId) { payload.login_password = `MediCare@${form.name.split(' ').pop()}${Math.floor(1000+Math.random()*9000)}` }
      if (editId) { await supabase.from('doctors').update(payload).eq('id', editId); toast.success('Updated') }
      else { await supabase.from('doctors').insert(payload); toast.success('Doctor added') }
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id) { if (!confirm('Delete?')) return; await supabase.from('doctors').delete().eq('id', id); toast.success('Deleted'); load() }

  function copyText(t) { navigator.clipboard.writeText(t); setCopied(true); setTimeout(()=>setCopied(false),2000); toast.success('Copied!') }

  const getGradient = (spec) => SPEC_COLORS[spec] || 'from-gray-500 to-gray-600'

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{[...Array(6)].map((_,i)=><div key={i} className="skeleton h-64 rounded-2xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Stethoscope size={24} className="text-emerald-500" /> Doctors</h1>
          <p className="text-sm text-gray-400 mt-1">{doctors.length} doctors on staff</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search doctors..." /></div>
          {isAdmin && <button onClick={openAdd} className="btn-primary"><Plus size={16}/> Add Doctor</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(d => (
          <div key={d.id} className="card-hover overflow-hidden">
            {/* Top gradient bar */}
            <div className={`h-2 bg-gradient-to-r ${getGradient(d.specialization)}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getGradient(d.specialization)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {d.name?.split(' ').pop()?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{d.name}</h3>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{d.specialization}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(d)} className="btn-ghost p-1.5"><Edit2 size={14}/></button>
                    <button onClick={() => remove(d.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <p className="flex items-center gap-2 text-xs text-gray-500"><Award size={12} className="text-gray-300"/> {d.qualification || '—'}</p>
                <p className="flex items-center gap-2 text-xs text-gray-500"><Star size={12} className="text-amber-400"/> {d.experience_years || 0} yrs experience</p>
                <p className="flex items-center gap-2 text-xs text-gray-500"><Clock size={12} className="text-gray-300"/> {d.availability || '—'}</p>
                <p className="flex items-center gap-2 text-xs text-gray-500"><Phone size={12} className="text-gray-300"/> {d.phone || '—'}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-border">
                <span className="text-xl font-extrabold text-emerald-600">₹{d.fee}</span>
                {isAdmin && (
                  <button onClick={() => setCredModal(d)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
                    <Key size={12}/> Credentials
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Doctor' : 'Add Doctor'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label:'Full Name', name:'name', required:true },
            { label:'Specialization', name:'specialization' },
            { label:'Phone', name:'phone' },
            { label:'Email', name:'email', type:'email' },
            { label:'Consultation Fee (₹)', name:'fee', type:'number' },
            { label:'Qualification', name:'qualification' },
            { label:'Experience (years)', name:'experience_years', type:'number' },
            { label:'Reg. Number', name:'reg_number' },
            { label:'Availability', name:'availability' },
          ].map(f => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input type={f.type||'text'} value={form[f.name]||''} onChange={e => setForm({...form,[f.name]:e.target.value})} className="input" required={f.required} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="label">Bio</label>
            <textarea value={form.bio||''} onChange={e => setForm({...form,bio:e.target.value})} className="input" rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update' : 'Add Doctor'}</button>
        </div>
      </Modal>

      {/* Credentials Modal */}
      <Modal open={!!credModal} onClose={() => setCredModal(null)} title="Doctor Login Credentials" size="sm">
        {credModal && (
          <div className="space-y-4 py-2">
            <div className="text-center mb-3">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradient(credModal.specialization)} mx-auto flex items-center justify-center text-white text-xl font-bold shadow-lg mb-3`}>
                {credModal.name?.split(' ').pop()?.[0]}
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">{credModal.name}</h3>
              <p className="text-xs text-primary-600">{credModal.specialization}</p>
            </div>
            {[['Email', credModal.email], ['Password', credModal.login_password]].map(([label, val]) => (
              <div key={label} className="p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{val || '—'}</code>
                  {val && <button onClick={() => copyText(val)} className="btn-ghost p-1.5">{copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
