import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import ManualFeeModal from '../../components/ManualFeeModal'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import FeeStatusBadge from '../../components/FeeStatusBadge'
import api from '../../api/axios'
import TableWrapper from '../../components/TableWrapper'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function SuperAdminFees() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(null)

  const { data: summary } = useQuery({
    queryKey: ['branch-summary'],
    queryFn: () => api.get('/fees/branch-summary').then(res => res.data)
  })

  const { data: students } = useQuery({
    queryKey: ['my-branch-students'],
    queryFn: () => api.get('/students/').then(res => res.data)
  })

  const { data: overview } = useQuery({
    queryKey: ['branch-overview', selectedMonth, selectedYear],
    queryFn: () => api.get(`/fees/branch-overview?month=${selectedMonth}&year=${selectedYear}`).then(res => res.data)
  })

  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => api.get('/payments/offline/pending').then(res => res.data)
  })

  const { data: myBranches } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => api.get('/branches/my-branches').then(res => res.data)
  })

  const approveRequest = useMutation({
    mutationFn: (id) => api.patch(`/payments/offline/${id}/approve`),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['pending-requests'])
      const prev = queryClient.getQueryData(['pending-requests'])
      queryClient.setQueryData(['pending-requests'], old => old?.filter(r => r.id !== id))
      return { prev }
    },
    onSuccess: () => {
      showToast('Payment approved successfully')
      queryClient.invalidateQueries(['branch-overview'])
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

  const filteredOverview = overview?.filter(s => {
    const matchName = s.full_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus
      ? filterStatus === 'paid'
        ? s.status === 'paid_online' || s.status === 'paid_offline'
        : s.status === filterStatus
      : true
    const matchBranch = selectedBranch ? s.branch_id === selectedBranch : true
    return matchName && matchStatus && matchBranch
  })

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Fee Entry</h2>
        <p className="text-sm text-gray-500 mt-1">Manual fee entries and offline payment requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Paid This Month', value: summary?.paid_count || 0, color: 'bg-green-50 text-green-800' },
          { label: 'Pending', value: summary?.pending_count || 0, color: 'bg-red-50 text-red-800' },
          { label: 'Offline Requests', value: pendingRequests?.length || 0, color: 'bg-yellow-50 text-yellow-800' },
        ].map(card => (
          <div key={card.label} className={`rounded-lg p-6 ${card.color}`}>
            <p className="text-sm font-medium">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Offline Requests */}
      {pendingRequests?.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 border-l-4 border-yellow-400">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Pending Offline Requests</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
              {pendingRequests.length} pending
            </span>
          </div>
          <div className="divide-y">
            {pendingRequests.map(req => (
              <div key={req.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {students?.find(s => s.id === req.student_id)?.full_name || `Student #${req.student_id}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    Rs.{req.amount} — {MONTHS[req.month - 1]} {req.year}
                    {req.paid_date && ` — Paid on ${new Date(req.paid_date).toLocaleDateString()}`}
                  </p>
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

      {/* Branch Filter */}
      {myBranches?.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setSelectedBranch(null)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
              selectedBranch === null
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Branches
          </button>
          {myBranches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                selectedBranch === b.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {b.name}
              <span className="ml-1.5 text-xs opacity-70">
                {students?.filter(s => s.branch_id === b.id).length || 0} students
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3 items-center justify-between flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="border rounded px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="border rounded px-3 py-2 text-sm w-20"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="paid_online">Paid — Online</option>
            <option value="paid_offline">Paid — Offline</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="no_record">No Record</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-700 text-white px-4 py-2 rounded hover:bg-indigo-800 text-sm"
        >
          + Manual Entry
        </button>
      </div>

      {/* Fee Overview Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-indigo-100">
        <TableWrapper>
          <table className="w-full">
            <thead className="bg-indigo-900 text-white">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold">Student</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Month/Year</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Amount</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Paid On</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOverview?.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">No records for this month</td></tr>
              ) : (
                filteredOverview?.map((s, idx) => (
                  <tr key={s.student_id} className={`border-b hover:bg-indigo-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 font-medium">{s.full_name}</td>
                    <td className="px-6 py-4">{s.month}/{s.year}</td>
                    <td className="px-6 py-4">{s.amount ? `Rs.${s.amount}` : '—'}</td>
                    <td className="px-6 py-4">{s.paid_at ? new Date(s.paid_at).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4"><FeeStatusBadge status={s.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>

      {showModal && (
        <ManualFeeModal
          students={students}
          onClose={() => setShowModal(false)}
          showToast={showToast}
        />
      )}
    </MainLayout>
  )
}

export default SuperAdminFees