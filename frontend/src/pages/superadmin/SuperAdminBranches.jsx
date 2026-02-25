import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import api from '../../api/axios'

function SuperAdminBranches() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', location: '' })

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches-overview'],
    queryFn: () => api.get('/branches/overview').then(res => res.data)
  })

  const createBranch = useMutation({
    mutationFn: (data) => api.post('/branches/', data),
    onSuccess: () => {
      showToast('Branch created successfully')
      queryClient.invalidateQueries(['branches-overview'])
      setShowForm(false)
      setFormData({ name: '', location: '' })
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to create branch', 'error')
  })

  const toggleBranch = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/branches/${id}`, { is_active }),
    onSuccess: () => {
      showToast('Branch updated')
      queryClient.invalidateQueries(['branches-overview'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to update', 'error')
  })

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Branches</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all karate school branches</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-700"
        >
          + New Branch
        </button>
      </div>

      {/* Create Branch Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="font-bold mb-4">Create New Branch</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Branch Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Chennai Central"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Location</label>
              <input
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder="Anna Nagar, Chennai"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => createBranch.mutate(formData)}
              disabled={createBranch.isPending || !formData.name || !formData.location}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {createBranch.isPending ? 'Creating...' : 'Create Branch'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Branches Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold">Branch</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Location</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Admins</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Students</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : branches?.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No branches yet</td></tr>
            ) : (
              branches?.map((branch, idx) => (
                <tr key={branch.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 font-medium">{branch.name}</td>
                  <td className="px-6 py-4 text-gray-500">{branch.location}</td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-medium">{branch.admin_count}</span>
                      {branch.admins.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {branch.admins.map(a => a.email).join(', ')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{branch.student_count}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${branch.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleBranch.mutate({ id: branch.id, is_active: !branch.is_active })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${branch.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      {branch.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </MainLayout>
  )
}

export default SuperAdminBranches