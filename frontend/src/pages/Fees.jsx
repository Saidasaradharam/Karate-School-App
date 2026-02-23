import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import FeeStatusBadge from '../components/FeeStatusBadge'
import api from '../api/axios'
import PaymentModal from '../components/PaymentModal'


const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function Fees() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [paymentModal, setPaymentModal] = useState(null)
  const [formData, setFormData] = useState({
    month: '',
    year: new Date().getFullYear(),
    amount: '',
    admin_id: '',
    paid_date: new Date().toISOString().split('T')[0],
    payment_type: 'cash'
  })
  const [error, setError] = useState('')

  const { data: feeRecords, isLoading } = useQuery({
    queryKey: ['my-fees'],
    queryFn: () => api.get('/fees/my-status').then(res => res.data)
  })

  const { data: admins } = useQuery({
    queryKey: ['branch-admins'],
    queryFn: () => api.get('/branches/my-branch-admins').then(res => res.data)
  })

  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => api.get('/payments/offline/my-requests').then(res => res.data)
  })

  const submitRequest = useMutation({
    mutationFn: (data) => api.post('/payments/offline/request', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-fees'])
      queryClient.invalidateQueries(['pending-requests'])
      setShowForm(false)
      setError('')
    },
    onError: (err) => setError(err.response?.data?.detail || 'Failed to submit request')
  })

  const cancelRequest = useMutation({
    mutationFn: (id) => api.patch(`/payments/offline/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries(['pending-requests'])
  })

  function handleSubmit(e) {
    e.preventDefault()
    submitRequest.mutate({
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      amount: parseFloat(formData.amount),
      admin_id: parseInt(formData.admin_id),
      paid_date: formData.paid_date,
      payment_type: formData.payment_type
    })
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Fees</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700">
          Request Offline Payment
        </button>
      </div>

      {/* Offline Payment Request Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold mb-4">Submit Offline Payment Request</h3>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Month</label>
              <select value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} required className="w-full border rounded px-3 py-2">
                <option value="">Select month</option>
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date</label>
              <input
                type="date"
                value={formData.paid_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setFormData({...formData, paid_date: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Payment Type</label>
              <div className="flex gap-3">
                {['cash', 'upi'].map(type => (
                  <label
                    key={type}
                    className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      formData.payment_type === type
                        ? 'border-gray-900 bg-gray-50 font-semibold'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_type"
                      value={type}
                      checked={formData.payment_type === type}
                      onChange={e => setFormData({...formData, payment_type: e.target.value})}
                      className="hidden"
                    />
                    <span>{type === 'cash' ? '💵 Cash' : '📱 UPI'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Admin</label>
              <select value={formData.admin_id} onChange={e => setFormData({...formData, admin_id: e.target.value})} required className="w-full border rounded px-3 py-2">
                <option value="">Select admin</option>
                {admins?.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={submitRequest.isPending} className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50">
                {submitRequest.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">Pending Requests</h3>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex justify-between items-center py-2 border-b last:border-0">
              <span className="text-sm">{MONTHS[req.month - 1]} {req.year} — Rs.{req.amount}</span>
              <button onClick={() => cancelRequest.mutate(req.id)} className="text-red-500 text-sm hover:underline">
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fee History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Month</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Year</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Amount</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Payment Type</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Paid On</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Action</th>

            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : feeRecords?.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">No fee records yet</td></tr>
            ) : (
              feeRecords?.map(record => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{MONTHS[record.month - 1]}</td>
                  <td className="px-6 py-4">{record.year}</td>
                  <td className="px-6 py-4">{record.amount ? `Rs.${record.amount}` : '—'}</td>
                  <td className="px-6 py-4 capitalize">{record.payment_type || '—'}</td>
                  <td className="px-6 py-4">{record.paid_at ? new Date(record.paid_at).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4"><FeeStatusBadge status={record.status} /></td>
                  <td className="px-6 py-4">
                    {record.status === 'pending' || record.status === 'no_record' ? (
                      <button
                        onClick={() => setPaymentModal({
                          month: record.month,
                          year: record.year,
                          amount: record.amount || 1500  // default amount if not set
                        })}
                        className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-700"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paymentModal && (
        <PaymentModal
          month={paymentModal.month}
          year={paymentModal.year}
          amount={paymentModal.amount}
          onSuccess={() => {
            queryClient.invalidateQueries(['my-fees'])
          }}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </MainLayout>
  )
}

export default Fees