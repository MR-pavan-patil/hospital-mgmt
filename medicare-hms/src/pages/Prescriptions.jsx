import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { Plus, Trash2, Receipt, IndianRupee, Search, Printer, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Prescriptions() {
  const { isAdmin, isDoctor, profile } = useAuth()
  const location = useLocation()
  const [rxList, setRxList] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [pharmacy, setPharmacy] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', diagnosis:'', medicines:[], notes:'', rx_date:'' })
  const [medSearch, setMedSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [rxRes, pRes, dRes, phRes] = await Promise.all([
      supabase.from('prescriptions').select('*, patients(name), doctors(name, fee)').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, name'),
      supabase.from('doctors').select('id, name, fee, specialization'),
      supabase.from('pharmacy_inventory').select('id, medicine_name, generic_name, unit_price, stock_quantity'),
    ])
    setRxList(rxRes.data || []); setPatients(pRes.data || []); setDoctors(dRes.data || []); setPharmacy(phRes.data || [])
    setLoading(false)

    // Auto-fill from appointment check-in
    if (location.state?.patient_id) {
      setForm({
        patient_id: location.state.patient_id,
        doctor_id: location.state.doctor_id || '',
        diagnosis: '', medicines: [], notes: '',
        rx_date: new Date().toISOString().split('T')[0]
      })
      setModalOpen(true)
    }
  }

  const filtered = rxList.filter(r =>
    r.patients?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setForm({ patient_id:'', doctor_id:'', diagnosis:'', medicines:[], notes:'', rx_date: new Date().toISOString().split('T')[0] })
    setModalOpen(true)
  }

  function addMedicine(med) {
    if (form.medicines.find(m => m.id === med.id)) return
    setForm({
      ...form,
      medicines: [...form.medicines, { id: med.id, name: med.medicine_name, dosage:'', duration:'', qty:1, price: med.unit_price }]
    })
    setMedSearch('')
  }

  function updateMed(i, field, val) {
    const meds = [...form.medicines]
    meds[i] = { ...meds[i], [field]: field === 'qty' || field === 'price' ? Number(val) : val }
    setForm({ ...form, medicines: meds })
  }

  function removeMed(i) { setForm({...form, medicines: form.medicines.filter((_,idx) => idx!==i) }) }

  const medTotal = form.medicines.reduce((s,m) => s + (m.qty * m.price), 0)
  const selectedDoc = doctors.find(d => d.id === form.doctor_id)
  const consultFee = selectedDoc?.fee || 0
  const grandTotal = medTotal + consultFee

  async function save() {
    setSaving(true)
    try {
      const { error } = await supabase.from('prescriptions').insert({
        patient_id: form.patient_id,
        doctor_id: form.doctor_id || null,
        diagnosis: form.diagnosis,
        medicines: form.medicines,
        notes: form.notes,
        rx_date: form.rx_date
      })
      if (error) throw error
      toast.success('Prescription created')
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function generateBill(rx) {
    try {
      const meds = rx.medicines || []
      const medItems = meds.map(m => ({ description: `${m.name} x ${m.qty}`, amount: m.qty * m.price }))
      const docFee = rx.doctors?.fee || 0
      const items = [...medItems]
      if (docFee > 0) items.push({ description: 'Consultation Fee', amount: docFee })
      const total = items.reduce((s, it) => s + it.amount, 0)

      await supabase.from('billing').insert({
        patient_id: rx.patient_id,
        total_amount: total,
        paid_amount: 0,
        payment_status: 'pending',
        items,
        notes: `Prescription bill — Diagnosis: ${rx.diagnosis || 'N/A'}`
      })
      toast.success(`Bill ₹${total.toLocaleString()} created from prescription`)
    } catch (err) { toast.error(err.message) }
  }

  const filteredPharmacy = pharmacy.filter(p =>
    p.medicine_name?.toLowerCase().includes(medSearch.toLowerCase()) ||
    p.generic_name?.toLowerCase().includes(medSearch.toLowerCase())
  ).slice(0, 8)

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList size={24} className="text-indigo-500" /> Prescriptions</h1>
          <p className="text-sm text-gray-400 mt-1">{rxList.length} prescriptions issued</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56"><SearchInput value={search} onChange={setSearch} placeholder="Search..." /></div>
          <button onClick={openAdd} className="btn-primary"><Plus size={16}/> New Prescription</button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(rx => (
          <div key={rx.id} className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">{rx.patients?.name}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-sm text-gray-500">{rx.doctors?.name}</span>
                </div>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{rx.diagnosis || 'No diagnosis'}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(rx.medicines||[]).map((m,i) => (
                    <span key={i} className="badge bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-300 text-xs">
                      {m.name} {m.dosage ? `(${m.dosage})` : ''} x{m.qty}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{new Date(rx.rx_date || rx.created_at).toLocaleDateString('en-IN')}</span>
                {isAdmin && (
                  <button onClick={() => generateBill(rx)} className="btn-success py-1.5 text-xs"><Receipt size={13}/> Generate Bill</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-gray-400 py-12">No prescriptions found</div>}
      </div>

      {/* Prescription Builder Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Prescription Builder" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Patient</label>
                <select value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})} className="input" required>
                  <option value="">Select Patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Doctor</label>
                <select value={form.doctor_id} onChange={e => setForm({...form,doctor_id:e.target.value})} className="input">
                  <option value="">Select Doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — ₹{d.fee}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Diagnosis</label>
              <input value={form.diagnosis} onChange={e => setForm({...form,diagnosis:e.target.value})} className="input" placeholder="Patient diagnosis..." />
            </div>

            {/* Medicine Search */}
            <div>
              <label className="label">Add Medicines</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={medSearch} onChange={e => setMedSearch(e.target.value)} placeholder="Search pharmacy..." className="input pl-9" />
              </div>
              {medSearch && (
                <div className="mt-1 border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filteredPharmacy.map(p => (
                    <button key={p.id} onClick={() => addMedicine(p)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-border text-sm text-left transition-colors">
                      <span className="text-gray-700 dark:text-gray-300">{p.medicine_name} <span className="text-gray-400">({p.generic_name})</span></span>
                      <span className="text-emerald-600 font-medium">₹{p.unit_price}</span>
                    </button>
                  ))}
                  {filteredPharmacy.length === 0 && <p className="px-3 py-2 text-gray-400 text-sm">No medicines found</p>}
                </div>
              )}
            </div>

            {/* Selected Medicines */}
            {form.medicines.length > 0 && (
              <div className="space-y-2">
                {form.medicines.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{m.name}</span>
                    <input value={m.dosage} onChange={e => updateMed(i,'dosage',e.target.value)} placeholder="Dosage" className="input w-24 text-xs py-1.5" />
                    <input value={m.duration} onChange={e => updateMed(i,'duration',e.target.value)} placeholder="Duration" className="input w-24 text-xs py-1.5" />
                    <input type="number" value={m.qty} onChange={e => updateMed(i,'qty',e.target.value)} className="input w-16 text-xs py-1.5" min={1} />
                    <span className="text-sm text-emerald-600 font-medium w-16 text-right">₹{m.qty * m.price}</span>
                    <button onClick={() => removeMed(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} className="input" rows={2} placeholder="Additional notes..." />
            </div>
          </div>

          {/* Right - Cost Summary */}
          <div className="space-y-4">
            <div className="card p-4 sticky top-0">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <IndianRupee size={16} className="text-emerald-500" /> Cost Estimate
              </h3>
              <div className="space-y-2 text-sm">
                {form.medicines.map((m,i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300 truncate">{m.name} x{m.qty}</span>
                    <span className="font-medium">₹{(m.qty*m.price).toLocaleString()}</span>
                  </div>
                ))}
                {consultFee > 0 && (
                  <div className="flex justify-between text-primary-600">
                    <span>Consultation Fee</span>
                    <span className="font-medium">₹{consultFee}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-2 border-t border-gray-200 dark:border-dark-border">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold text-emerald-600">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Prescription'}</button>
        </div>
      </Modal>
    </div>
  )
}
