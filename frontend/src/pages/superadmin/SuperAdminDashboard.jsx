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

      {/* Per Branch Student Summary */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Students Per Branch</h3>
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
                    <td className="px-6 py-4">{branch.student_count}</td>
                    <td className="px-6 py-4">{branch.admin_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {branch.admins.length > 0
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

      {/* Branch Requests */}
      {branchRequests?.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Pending Branch Requests</h3>
          </div>
          <div className="divide-y">
            {branchRequests.map(req => (
              <div key={req.id} className="px-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Branch ID: {req.branch_id}</p>
                    <p className="text-sm text-gray-500">Requested by user ID: {req.requested_by}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {showRejectInput[req.id] ? (
                      <div className="flex gap-2 items-center">
                        <input
                          placeholder="Reason for rejection..."
                          value={rejectReason[req.id] || ''}
                          onChange={e => setRejectReason(prev => ({...prev, [req.id]: e.target.value}))}
                          className="border rounded px-3 py-1.5 text-sm w-48"
                        />
                        <button
                          onClick={() => rejectRequest.mutate({ id: req.id, reason: rejectReason[req.id] })}
                          className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowRejectInput(prev => ({...prev, [req.id]: false}))}
                          className="border px-3 py-1.5 rounded text-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => approveRequest.mutate(req.id)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectInput(prev => ({...prev, [req.id]: true}))}
                          className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default SuperAdminDashboard