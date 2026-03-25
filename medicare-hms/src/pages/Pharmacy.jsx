import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { Plus, Edit2, Trash2, Package, AlertTriangle, ShoppingCart, Pill } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Pharmacy() {
  const { isAdmin } = useAuth()
  const [meds, setMeds] = useState([])
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [dispenseModal, setDispenseModal] = useState(false)
  const [form, setForm] = useState({ medicine_name:'', generic_name:'', category:'', stock_quantity:0, unit_price:0, expiry_date:'', manufacturer:'', image_url:'', description:'' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dispenseForm, setDispenseForm] = useState({ med:null, patient_id:'', qty:1 })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [mRes, pRes] = await Promise.all([
      supabase.from('pharmacy_inventory').select('*').order('medicine_name'),
      supabase.from('patients').select('id, name'),
    ])
    setMeds(mRes.data || []); setPatients(pRes.data || [])
    setLoading(false)
  }

  const filtered = meds.filter(m =>
    m.medicine_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setForm({ medicine_name:'', generic_name:'', category:'', stock_quantity:0, unit_price:0, expiry_date:'', manufacturer:'', image_url:'', description:'' }); setEditId(null); setModalOpen(true) }
  function openEdit(m) { setForm({...m}); setEditId(m.id); setModalOpen(true) }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, stock_quantity: Number(form.stock_quantity), unit_price: Number(form.unit_price) }
      delete payload.id; delete payload.created_at
      if (editId) {
        await supabase.from('pharmacy_inventory').update(payload).eq('id', editId)
        toast.success('Medicine updated')
      } else {
        await supabase.from('pharmacy_inventory').insert(payload)
        toast.success('Medicine added')
      }
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  function openDispense(m) { setDispenseForm({ med: m, patient_id:'', qty:1 }); setDispenseModal(true) }

  async function dispense() {
    setSaving(true)
    try {
      const { med, patient_id, qty } = dispenseForm
      if (!patient_id) { toast.error('Select a patient'); setSaving(false); return }
      if (qty > med.stock_quantity) { toast.error('Insufficient stock'); setSaving(false); return }

      // Reduce stock
      await supabase.from('pharmacy_inventory').update({ stock_quantity: med.stock_quantity - qty }).eq('id', med.id)

      // Auto-create bill
      const total = qty * med.unit_price
      await supabase.from('billing').insert({
        patient_id,
        total_amount: total,
        paid_amount: 0,
        payment_status: 'pending',
        items: [{ description: `${med.medicine_name} x ${qty}`, amount: total }],
        notes: `Pharmacy dispense: ${med.medicine_name}`
      })

      toast.success(`Dispensed ${qty}x ${med.medicine_name} — Bill ₹${total} created`)
      setDispenseModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this medicine?')) return
    await supabase.from('pharmacy_inventory').delete().eq('id', id)
    toast.success('Medicine deleted'); load()
  }

  const isExpiring = (d) => d && new Date(d) < new Date(Date.now() + 30*24*60*60*1000)
  const isLow = (q) => q < 10

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{[...Array(8)].map((_,i)=><div key={i} className="skeleton h-56 rounded-2xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><Pill size={24} className="text-teal-500" /> Pharmacy</h1>
          <p className="text-sm text-gray-400 mt-1">{meds.length} medicines in inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search medicines..." /></div>
          {isAdmin && <button onClick={openAdd} className="btn-primary"><Plus size={16}/> Add Medicine</button>}
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(m => (
          <div key={m.id} className="card-hover overflow-hidden">
            {m.image_url ? (
              <img src={m.image_url} alt={m.medicine_name} className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-500/10 dark:to-primary-500/5 flex items-center justify-center">
                <Package size={40} className="text-primary-300 dark:text-primary-600" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.medicine_name}</h3>
                  <p className="text-xs text-gray-500 dark:text-dark-muted">{m.generic_name || m.category || '—'}</p>
                </div>
                <span className="text-lg font-bold text-emerald-600">₹{m.unit_price}</span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className={`badge ${isLow(m.stock_quantity) ? 'badge-danger' : 'badge-success'}`}>
                    {m.stock_quantity} in stock
                  </span>
                  {isExpiring(m.expiry_date) && (
                    <span className="badge badge-warning flex items-center gap-1"><AlertTriangle size={10}/> Expiring</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
                {isAdmin && (
                  <>
                    <button onClick={() => openDispense(m)} className="btn-success flex-1 py-1.5 text-xs"><ShoppingCart size={13}/> Dispense</button>
                    <button onClick={() => openEdit(m)} className="btn-ghost p-1.5"><Edit2 size={14}/></button>
                    <button onClick={() => remove(m.id)} className="btn-ghost p-1.5 text-red-500"><Trash2 size={14}/></button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-gray-400 py-12">No medicines found</div>}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Medicine' : 'Add Medicine'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label:'Medicine Name', name:'medicine_name', required:true },
            { label:'Generic Name', name:'generic_name' },
            { label:'Category', name:'category' },
            { label:'Manufacturer', name:'manufacturer' },
            { label:'Stock Quantity', name:'stock_quantity', type:'number' },
            { label:'Unit Price (₹)', name:'unit_price', type:'number' },
            { label:'Expiry Date', name:'expiry_date', type:'date' },
            { label:'Image URL', name:'image_url' },
          ].map(f => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input type={f.type||'text'} value={form[f.name]||''} onChange={e => setForm({...form,[f.name]:e.target.value})} className="input" required={f.required} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea value={form.description||''} onChange={e => setForm({...form,description:e.target.value})} className="input" rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update' : 'Add'}</button>
        </div>
      </Modal>

      {/* Dispense Modal */}
      <Modal open={dispenseModal} onClose={() => setDispenseModal(false)} title={`Dispense: ${dispenseForm.med?.medicine_name}`} size="sm">
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg text-sm">
            <p>Available Stock: <strong>{dispenseForm.med?.stock_quantity}</strong></p>
            <p>Price per unit: <strong>₹{dispenseForm.med?.unit_price}</strong></p>
          </div>
          <div>
            <label className="label">Patient</label>
            <select value={dispenseForm.patient_id} onChange={e => setDispenseForm({...dispenseForm,patient_id:e.target.value})} className="input">
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" min={1} max={dispenseForm.med?.stock_quantity} value={dispenseForm.qty} onChange={e => setDispenseForm({...dispenseForm,qty:Number(e.target.value)})} className="input" />
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-center">
            <p className="text-sm text-gray-500">Bill Amount</p>
            <p className="text-2xl font-bold text-emerald-600">₹{(dispenseForm.qty * (dispenseForm.med?.unit_price||0)).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setDispenseModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={dispense} disabled={saving} className="btn-success">{saving ? 'Processing...' : 'Dispense & Bill'}</button>
        </div>
      </Modal>
    </div>
  )
}
