import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function ManualFeeModal({ students, onClose, showToast }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    student_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    paid_date: new Date().toISOString().split('T')[0],
    payment_type: 'cash'
  })

  const submit = useMutation({
    mutationFn: (data) => api.post('/fees/manual-entry', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['branch-overview'])
      queryClient.invalidateQueries(['branch-summary'])
      showToast('Fee entry added successfully')
      onClose()
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to add entry', 'error')
  })

  function handleSubmit(e) {
    e.preventDefault()
    submit.mutate({
      student_id: parseInt(formData.student_id),
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      amount: parseFloat(formData.amount),
      paid_date: formData.paid_date,
      payment_type: formData.payment_type
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Manual Fee Entry</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} required className="w-full border rounded px-3 py-2">
              <option value="">Select student</option>
              {students?.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Month</label>
              <select value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} className="w-full border rounded px-3 py-2">
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} required className="w-full border rounded px-3 py-2" />
            </div>
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
          <div>
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
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submit.isPending} className="flex-1 bg-gray-900 text-white py-2 rounded hover:bg-gray-700 disabled:opacity-50">
              {submit.isPending ? 'Saving...' : 'Save Entry'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border py-2 rounded hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ManualFeeModal