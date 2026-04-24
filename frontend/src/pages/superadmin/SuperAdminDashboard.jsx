import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import api from '../../api/axios'
import TableWrapper from '../../components/TableWrapper'

function SuperAdminDashboard() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const [rejectReason, setRejectReason] = useState({})
  const [showRejectInput, setShowRejectInput] = useState({})
  const [showPromotionRequests, setShowPromotionRequests] = useState(false)
  const [showBranchRequests, setShowBranchRequests] = useState(false)
  // const [selectedBranch, setSelectedBranch] = useState(null)

  const { data: promotionRequests } = useQuery({
    queryKey: ['promotion-requests'],
    queryFn: () => api.get('/admins/promotion-requests').then(res => res.data)
  })

  const approvePromotion = useMutation({
    mutationFn: (id) => api.patch(`/admins/promotion-requests/${id}/approve`),
    onSuccess: () => {
      showToast('Promotion approved')
      queryClient.invalidateQueries(['promotion-requests'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed', 'error')
  })

  const rejectPromotion = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/admins/promotion-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      showToast('Promotion rejected')
      queryClient.invalidateQueries(['promotion-requests'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed', 'error')
  })

  const { data: branchesOverview, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches-overview'],
    queryFn: () => api.get('/branches/overview').then(res => res.data)
  })

  const { data: branchRequests } = useQuery({
    queryKey: ['branch-requests'],
    queryFn: () => api.get('/branches/requests').then(res => res.data)
  })

  const approveRequest = useMutation({
    mutationFn: (id) => api.patch(`/branches/requests/${id}/approve`),
    onSuccess: () => {
      showToast('Branch approved successfully')
      queryClient.invalidateQueries(['branch-requests'])
      queryClient.invalidateQueries(['branches-overview'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to approve', 'error')
  })

  const rejectRequest = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/branches/requests/${id}/reject`, { reason }),
    onSuccess: () => {
      showToast('Branch request rejected')
      queryClient.invalidateQueries(['branch-requests'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to reject', 'error')
  })

  const totalStudents = branchesOverview?.reduce((sum, b) => sum + b.student_count, 0) || 0
  const totalAdmins = branchesOverview?.reduce((sum, b) => sum + b.admin_count, 0) || 0
  const totalBranches = branchesOverview?.length || 0

  // const filteredBranches = selectedBranch
  //   ? branchesOverview?.filter(b => b.id === selectedBranch)
  //   : branchesOverview

  return (
    <MainLayout>
      <Toast toasts={toasts} />
      <h2 className="text-2xl font-bold mb-6">Super Admin Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Branches', value: totalBranches, color: 'bg-blue-50 text-blue-800' },
          { label: 'Total Students', value: totalStudents, color: 'bg-green-50 text-green-800' },
          { label: 'Total Admins', value: totalAdmins, color: 'bg-purple-50 text-purple-800' },
        ].map(card => (
          <div key={card.label} className={`rounded-lg p-6 ${card.color}`}>
            <p className="text-sm font-medium">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Promotion Requests */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold">⬆️ Promotion Requests</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {promotionRequests?.length || 0} pending
            </p>
          </div>
          <button
            onClick={() => setShowPromotionRequests(!showPromotionRequests)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            {showPromotionRequests ? 'Hide' : 'View Promotion Requests'}
          </button>
        </div>

        {showPromotionRequests && (
          <div className="mt-4 space-y-3">
            {promotionRequests?.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No pending promotion requests</p>
            ) : (
              promotionRequests?.map(req => (
                <div key={req.id} className="border border-gray-100 rounded-xl p-4 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-sm">{req.student?.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      🥋 {req.student?.belt_grade} · 📍 {req.branch?.name}
                      {req.branch?.location && `, ${req.branch.location}`}
                    </p>
                    {req.reason && <p className="text-xs text-gray-400 mt-1 italic">"{req.reason}"</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approvePromotion.mutate(req.id)}
                      className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-semibold hover:bg-green-200"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectPromotion.mutate({ id: req.id, reason: '' })}
                      className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-semibold hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Branch Requests */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold">🏢 Branch Requests</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {branchRequests?.length || 0} pending
            </p>
          </div>
          <button
            onClick={() => setShowBranchRequests(!showBranchRequests)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            {showBranchRequests ? 'Hide' : 'View Branch Requests'}
          </button>
        </div>

        {showBranchRequests && (
          <div className="mt-4 space-y-3">
            {branchRequests?.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No pending branch requests</p>
            ) : (
              branchRequests?.map(req => (
                <div key={req.id} className="border border-gray-100 rounded-xl p-4 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-sm">{req.branch?.name || `Branch ID: ${req.branch_id}`}</p>
                    <p className="text-xs text-gray-500 mt-0.5">📍 {req.branch?.location}</p>
                    <p className="text-xs text-gray-400 mt-1">Requested by: {req.requester_name}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 items-center">
                    {showRejectInput[req.id] ? (
                      <div className="flex gap-2 items-center">
                        <input
                          placeholder="Reason for rejection..."
                          value={rejectReason[req.id] || ''}
                          onChange={e => setRejectReason(prev => ({...prev, [req.id]: e.target.value}))}
                          className="border rounded-lg px-3 py-1.5 text-sm w-48"
                        />
                        <button
                          onClick={() => rejectRequest.mutate({ id: req.id, reason: rejectReason[req.id] })}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowRejectInput(prev => ({...prev, [req.id]: false}))}
                          className="border px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => approveRequest.mutate(req.id)}
                          className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-semibold hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectInput(prev => ({...prev, [req.id]: true}))}
                          className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-semibold hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Per Branch Student Summary */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-4 border-b flex justify-between items-center flex-wrap gap-3">
          <h3 className="font-semibold">Students Per Branch</h3>
          {/* Branch filter buttons */}
          {/* {branchesOverview?.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedBranch(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  selectedBranch === null
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {branchesOverview.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranch(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    selectedBranch === b.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {b.name}
                  <span className="ml-1.5 opacity-70">{b.student_count} students</span>
                </button>
              ))}
            </div>
          )} */}
        </div>
        <TableWrapper>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Branch</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Location</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Students</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Admins</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Assigned Admins</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {branchesLoading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : branchesOverview?.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No branches found</td></tr>
              ) : (
                branchesOverview?.map(branch => (
                  <tr key={branch.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{branch.name}</td>
                    <td className="px-6 py-4 text-gray-500">{branch.location}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">{branch.student_count}</span>
                      <span className="text-xs text-gray-400 ml-1">students</span>
                    </td>
                    <td className="px-6 py-4">{branch.admin_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {branch.admins?.length > 0
                        ? branch.admins.map(a => a.email).join(', ')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${branch.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>

    </MainLayout>
  )
}

export default SuperAdminDashboard