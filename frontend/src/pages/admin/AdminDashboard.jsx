import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import FeeStatusBadge from '../../components/FeeStatusBadge'
import ManualFeeModal from '../../components/ManualFeeModal'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import api from '../../api/axios'
import TableWrapper from '../../components/TableWrapper'


function AdminDashboard() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [search, setSearch] = useState('')
  const [filterBelt, setFilterBelt] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const { data: summary } = useQuery({
    queryKey: ['branch-summary'],
    queryFn: () => api.get('/fees/branch-summary').then(res => res.data)
  })

  const { data: overview } = useQuery({
    queryKey: ['branch-overview', selectedMonth, selectedYear],
    queryFn: () => api.get(`/fees/branch-overview?month=${selectedMonth}&year=${selectedYear}`).then(res => res.data)
  })

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => api.get('/students/').then(res => res.data)
  })

  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => api.get('/payments/offline/pending').then(res => res.data)
  })

  const approveRequest = useMutation({
    mutationFn: (id) => api.patch(`/payments/offline/${id}/approve`),
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries(['pending-requests'])
      const prev = queryClient.getQueryData(['pending-requests'])
      queryClient.setQueryData(['pending-requests'], old => old?.filter(r => r.id !== id))
      return { prev }
    },
    onSuccess: () => {
      showToast('Payment approved successfully')
      queryClient.invalidateQueries(['branch-overview'])
      queryClient.invalidateQueries(['branch-summary'])
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['pending-requests'], context.prev)
      showToast(err.response?.data?.detail || 'Failed to approve', 'error')
    }
  })

  const rejectRequest = useMutation({
    mutationFn: (id) => api.patch(`/payments/offline/${id}/reject`, { reason: '' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['pending-requests'])
      const prev = queryClient.getQueryData(['pending-requests'])
      queryClient.setQueryData(['pending-requests'], old => old?.filter(r => r.id !== id))
      return { prev }
    },
    onSuccess: () => showToast('Payment rejected'),
    onError: (err, _, context) => {
      queryClient.setQueryData(['pending-requests'], context.prev)
      showToast(err.response?.data?.detail || 'Failed to reject', 'error')
    }
  })
  // Filter logic
  const filteredOverview = overview?.filter(s => {
    const matchName = s.full_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus ? s.status === filterStatus : true
    return matchName && matchStatus
  })

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Students', value: summary?.total_students || 0, color: 'bg-blue-50 text-blue-800' },
          { label: 'Paid This Month', value: summary?.paid_count || 0, color: 'bg-green-50 text-green-800' },
          { label: 'Pending', value: summary?.pending_count || 0, color: 'bg-red-50 text-red-800' },
          { label: 'Offline Requests', value: pendingRequests?.length || 0, color: 'bg-yellow-50 text-yellow-800' },
        ].map(card => (
          <div key={card.label} className={`rounded-lg p-4 ${card.color}`}>
            <p className="text-sm font-medium">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Fee Overview Table */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-4 border-b flex flex-wrap gap-3 justify-between items-center">
          <h3 className="font-semibold">Monthly Fee Overview</h3>
          <div className="flex gap-3 flex-wrap">
            <input
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            />

            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border rounded px-3 py-1.5 text-sm">
  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
    <option key={i} value={i+1}>{m}</option>
  ))}
</select>
<input
  type="number"
  value={selectedYear}
  onChange={e => setSelectedYear(parseInt(e.target.value))}
  className="border rounded px-3 py-1.5 text-sm w-20"
/>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
              <option value="">All statuses</option>
              <option value="paid_online">Paid Online</option>
              <option value="paid_offline">Paid Offline</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="no_record">No Record</option>
            </select>
            <button onClick={() => setShowManualEntry(true)} className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700">
              + Manual Entry
            </button>
          </div>
        </div>
        <TableWrapper>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Student</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Month/Year</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Paid At</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOverview?.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">No records found</td></tr>            ) : (
                filteredOverview?.map(s => (
                  <tr key={s.student_id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{s.full_name}</td>
                    <td className="px-6 py-4">{s.month}/{s.year}</td>
                    <td className="px-6 py-4">{s.amount ? `Rs.${s.amount}` : '—'}</td>
                    <td className="px-3 py-2">{s.paid_at ? new Date(s.paid_at).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4"><FeeStatusBadge status={s.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>

      {/* Pending Offline Requests */}
      {pendingRequests?.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Pending Offline Payment Requests</h3>
          </div>
          <div className="divide-y">
            {pendingRequests.map(req => (
              <div key={req.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">Student ID: {req.student_id}</p>
                  <p className="text-sm text-gray-500">Rs.{req.amount} — {req.month}/{req.year}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveRequest.mutate(req.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={() => rejectRequest.mutate(req.id)} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Fee Entry Modal */}
      {showManualEntry && (
        <ManualFeeModal
          students={students}
          onClose={() => setShowManualEntry(false)}
          showToast={showToast}
        />
      )}
    </MainLayout>
  )
}
export default AdminDashboard