import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { Plus, Edit2, Trash2, IndianRupee, CreditCard, ChevronLeft, ChevronRight, Receipt, X as XIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Billing() {
  const { isAdmin } = useAuth()
  const [bills, setBills] = useState([])
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [form, setForm] = useState({ patient_id:'', appointment_id:'', total_amount:0, paid_amount:0, payment_status:'pending', payment_method:'', items:[], notes:'' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [payForm, setPayForm] = useState({ amount:'', method:'Cash' })
  const [payBill, setPayBill] = useState(null)
  const [page, setPage] = useState(0)
  const perPage = 15

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [bRes, pRes, aRes] = await Promise.all([
      supabase.from('billing').select('*, patients(name)').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, name'),
      supabase.from('appointments').select('id, appointment_date, patients(name), doctors(name)'),
    ])
    setBills(bRes.data || []); setPatients(pRes.data || []); setAppointments(aRes.data || [])
    setLoading(false)
  }

  const stats = {
    total: bills.reduce((s,b) => s + Number(b.total_amount), 0),
    collected: bills.reduce((s,b) => s + Number(b.paid_amount), 0),
    pending: bills.reduce((s,b) => s + (Number(b.total_amount) - Number(b.paid_amount)), 0),
  }

  const filtered = bills.filter(b => {
    const matchTab = tab === 'all' || b.payment_status === tab
    const matchSearch = b.patients?.name?.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })
  const paged = filtered.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  function openAdd() {
    setForm({ patient_id:'', appointment_id:'', total_amount:0, paid_amount:0, payment_status:'pending', payment_method:'', items:[{ description:'Consultation', amount:500 }], notes:'' })
    setEditId(null); setModalOpen(true)
  }

  function addItem() { setForm({...form, items:[...form.items, { description:'', amount:0 }]}) }
  function removeItem(i) { setForm({...form, items: form.items.filter((_,idx)=>idx!==i)}) }
  function updateItem(i, field, val) {
    const items = [...form.items]; items[i] = {...items[i], [field]: field==='amount'?Number(val):val}
    const total = items.reduce((s,it)=>s+Number(it.amount),0)
    setForm({...form, items, total_amount: total})
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, total_amount: Number(form.total_amount), paid_amount: Number(form.paid_amount) }
      if (editId) {
        const { error } = await supabase.from('billing').update(payload).eq('id', editId)
        if (error) throw error
        toast.success('Bill updated')
      } else {
        const { error } = await supabase.from('billing').insert(payload)
        if (error) throw error
        toast.success('Bill created')
      }
      setModalOpen(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  function openPay(b) { setPayBill(b); setPayForm({ amount: String(b.total_amount - b.paid_amount), method:'Cash' }); setPayModal(true) }

  async function recordPayment() {
    setSaving(true)
    try {
      const newPaid = Number(payBill.paid_amount) + Number(payForm.amount)
      const status = newPaid >= Number(payBill.total_amount) ? 'paid' : 'partial'
      await supabase.from('billing').update({ paid_amount: newPaid, payment_status: status, payment_method: payForm.method }).eq('id', payBill.id)
      toast.success('Payment recorded')
      setPayModal(false); load()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this bill?')) return
    await supabase.from('billing').delete().eq('id', id)
    toast.success('Bill deleted'); load()
  }

  const statusBadge = (s) => ({ pending:'badge-warning', partial:'badge-info', paid:'badge-success' }[s] || 'badge-info')

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2"><Receipt size={24} className="text-violet-500" /> Billing</h1>
        <p className="text-sm text-gray-400 mt-1">{bills.length} total bills</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-hover p-5 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 opacity-[0.08]" />
          <div className="flex items-center gap-3 relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20"><IndianRupee size={18} className="text-white"/></div>
            <div><p className="text-xs text-gray-400 font-medium">Total Billed</p><p className="text-xl font-extrabold text-gray-900 dark:text-white">₹{stats.total.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="card-hover p-5 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-[0.08]" />
          <div className="flex items-center gap-3 relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20"><CreditCard size={18} className="text-white"/></div>
            <div><p className="text-xs text-gray-400 font-medium">Collected</p><p className="text-xl font-extrabold text-emerald-600">₹{stats.collected.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="card-hover p-5 relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 opacity-[0.08]" />
          <div className="flex items-center gap-3 relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/20"><Receipt size={18} className="text-white"/></div>
            <div><p className="text-xs text-gray-400 font-medium">Pending</p><p className="text-xl font-extrabold text-rose-600">₹{stats.pending.toLocaleString()}</p></div>
          </div>
        </div>
      </div>

      {/* Tabs + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-gray-100 dark:bg-dark-card rounded-xl p-1 gap-1">
          {[['all','All'],['pending','Pending'],['paid','Paid']].map(([val,label]) => (
            <button key={val} onClick={() => { setTab(val); setPage(0) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===val?'bg-white dark:bg-dark-border shadow-sm text-primary-600':'text-gray-500 hover:text-gray-700'}`}
            >{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56"><SearchInput value={search} onChange={setSearch} placeholder="Search patient..." /></div>
          {isAdmin && <button onClick={openAdd} className="btn-primary"><Plus size={16}/> New Bill</button>}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-dark-bg">
              <tr>
                {['Date','Patient','Total','Paid','Due','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(b => (
                <tr key={b.id} className="border-t border-gray-100 dark:border-dark-border hover:bg-gray-50/50 dark:hover:bg-dark-border/30">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.patients?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">₹{Number(b.total_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-emerald-600">₹{Number(b.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-600">₹{(b.total_amount - b.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusBadge(b.payment_status)}`}>{b.payment_status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {b.payment_status !== 'paid' && <button onClick={() => openPay(b)} className="btn-ghost p-1.5 text-emerald-600" title="Record Payment"><CreditCard size={15}/></button>}
                      {isAdmin && <button onClick={() => remove(b.id)} className="btn-ghost p-1.5 text-red-500"><Trash2 size={15}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No bills found</td></tr>}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-border">
            <span className="text-sm text-gray-500">{filtered.length} bill(s)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0} className="btn-ghost p-1.5"><ChevronLeft size={16}/></button>
              <span className="text-sm">{page+1} / {totalPages}</span>
              <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} className="btn-ghost p-1.5"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Create Bill Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Bill" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Patient</label>
              <select value={form.patient_id} onChange={e => setForm({...form, patient_id: e.target.value})} className="input">
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="input">
                <option value="">Select</option>
                {['Cash','Card','UPI','Net Banking','Insurance'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Line Items</label>
              <button onClick={addItem} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={item.description} onChange={e => updateItem(i,'description',e.target.value)} placeholder="Description" className="input flex-1" />
                  <input type="number" value={item.amount} onChange={e => updateItem(i,'amount',e.target.value)} placeholder="Amount" className="input w-28" />
                  <button onClick={() => removeItem(i)} className="btn-ghost p-1.5 text-red-500"><XIcon size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-dark-bg">
            <span className="font-medium text-gray-700 dark:text-gray-300">Total Amount</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">₹{form.items.reduce((s,it)=>s+Number(it.amount),0).toLocaleString()}</span>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} className="input" rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Bill'}</button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Bill Total</span><span className="font-medium">₹{payBill?.total_amount}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-gray-500">Already Paid</span><span className="text-emerald-600">₹{payBill?.paid_amount}</span></div>
            <div className="flex justify-between text-sm mt-1 pt-1 border-t border-gray-200 dark:border-dark-border"><span className="font-medium text-gray-700 dark:text-gray-300">Due</span><span className="font-bold text-red-600">₹{payBill ? payBill.total_amount - payBill.paid_amount : 0}</span></div>
          </div>
          <div>
            <label className="label">Amount Received</label>
            <input type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className="input" />
          </div>
          <div>
            <label className="label">Method</label>
            <select value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})} className="input">
              {['Cash','Card','UPI','Net Banking','Insurance'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={() => setPayModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={recordPayment} disabled={saving} className="btn-success">{saving? 'Processing...':'Record Payment'}</button>
        </div>
      </Modal>
    </div>
  )
}
