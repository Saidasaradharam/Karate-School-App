import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

function BranchManagement() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [editingBranch, setEditingBranch] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', location: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', location: '' })

  const { data: branches, isLoading } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => isSuperAdmin
      ? api.get('/branches/overview').then(res => res.data)
      : api.get('/branches/my-branches').then(res => res.data)
  })

  const updateBranch = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/branches/${id}`, data),
    onSuccess: () => {
      showToast('Branch updated successfully')
      queryClient.invalidateQueries(['my-branches'])
      queryClient.invalidateQueries(['branches-overview'])
      setEditingBranch(null)
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to update', 'error')
  })

  const deleteBranch = useMutation({
    mutationFn: (id) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      showToast('Branch deleted')
      queryClient.invalidateQueries(['my-branches'])
      queryClient.invalidateQueries(['branches-overview'])
      setConfirmDelete(null)
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to delete', 'error')
  })

  const createBranch = useMutation({
    mutationFn: (data) => api.post('/branches/', data),
    onSuccess: () => {
      showToast('Branch created successfully')
      queryClient.invalidateQueries(['my-branches'])
      queryClient.invalidateQueries(['branches-overview'])
      setShowCreateForm(false)
      setCreateForm({ name: '', location: '' })
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to create', 'error')
  })

  const [showRequestForm, setShowRequestForm] = useState(false)
    const [requestForm, setRequestForm] = useState({ name: '', location: '', reason: '' })

    const requestBranch = useMutation({
    mutationFn: (data) => api.post('/branches/request', data),
    onSuccess: () => {
        showToast('Branch request submitted to super admin')
        setShowRequestForm(false)
        setRequestForm({ name: '', location: '', reason: '' })
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to submit', 'error')
    })

  function openEdit(branch) {
    setEditingBranch(branch.id)
    setEditForm({ name: branch.name, location: branch.location })
  }

  const inputClass = "w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
  const labelClass = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-2xl mb-3">⚠️</p>
            <h3 className="font-bold text-lg mb-2">Delete Branch?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteBranch.mutate(confirmDelete.id)}
                disabled={deleteBranch.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleteBranch.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold">Branches</h2>
            <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin ? 'Manage all branches' : 'Manage your assigned branches'}
            </p>
        </div>
        <div className="flex gap-3">
            {!isSuperAdmin && (
            <button
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50"
            >
                + Request New Branch
            </button>
            )}
            {isSuperAdmin && (
            <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-700"
            >
                + New Branch
            </button>
            )}
        </div>
        </div>

      {/* Create Form — Super Admin only */}
      {showCreateForm && isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="font-bold mb-4">Create New Branch</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Branch Name <span className="text-red-500">*</span></label>
              <input
                value={createForm.name}
                onChange={e => setCreateForm({...createForm, name: e.target.value})}
                placeholder="Chennai Central"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Location <span className="text-red-500">*</span></label>
              <input
                value={createForm.location}
                onChange={e => setCreateForm({...createForm, location: e.target.value})}
                placeholder="Anna Nagar, Chennai"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => createBranch.mutate(createForm)}
              disabled={createBranch.isPending || !createForm.name || !createForm.location}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {createBranch.isPending ? 'Creating...' : 'Create Branch'}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="border px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Branches List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : branches?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">No branches found</div>
        ) : (
          branches?.map(branch => (
            <div key={branch.id} className="bg-white rounded-2xl shadow p-5">
              {editingBranch === branch.id ? (
                /* Edit Form */
                <div>
                  <h3 className="font-bold mb-4">Edit Branch</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={labelClass}>Branch Name</label>
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Location</label>
                      <input
                        value={editForm.location}
                        onChange={e => setEditForm({...editForm, location: e.target.value})}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="mb-4">
                      <label className={labelClass}>Status</label>
                      <div className="flex gap-3">
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${editForm.is_active !== false ? 'border-gray-900 bg-gray-900 text-white font-semibold' : 'border-gray-200'}`}>
                          <input type="radio" name="status" checked={editForm.is_active !== false} onChange={() => setEditForm({...editForm, is_active: true})} className="hidden" />
                          Active
                        </label>
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${editForm.is_active === false ? 'border-gray-900 bg-gray-900 text-white font-semibold' : 'border-gray-200'}`}>
                          <input type="radio" name="status" checked={editForm.is_active === false} onChange={() => setEditForm({...editForm, is_active: false})} className="hidden" />
                          Inactive
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateBranch.mutate({ id: branch.id, data: editForm })}
                      disabled={updateBranch.isPending}
                      className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {updateBranch.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditingBranch(null)} className="border px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Branch Card */
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-gray-900">{branch.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${branch.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {branch.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">📍 {branch.location}</p>
                    {isSuperAdmin && (
                      <p className="text-xs text-gray-400 mt-1">
                        {branch.student_count} students · {branch.admin_count} admins
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(branch)}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(branch)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    {/* Request Form — Admin only */}
    {showRequestForm && !isSuperAdmin && (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold mb-1">Request New Branch</h3>
        <p className="text-sm text-gray-500 mb-4">Submit a request to super admin for approval</p>
        <div className="grid grid-cols-2 gap-4">
        <div>
            <label className={labelClass}>Branch Name <span className="text-red-500">*</span></label>
            <input
            value={requestForm.name}
            onChange={e => setRequestForm({...requestForm, name: e.target.value})}
            placeholder="Chennai South"
            className={inputClass + ' bg-white'}
            />
        </div>
        <div>
            <label className={labelClass}>Location <span className="text-red-500">*</span></label>
            <input
            value={requestForm.location}
            onChange={e => setRequestForm({...requestForm, location: e.target.value})}
            placeholder="Velachery, Chennai"
            className={inputClass + ' bg-white'}
            />
        </div>
        <div className="col-span-2">
            <label className={labelClass}>Reason <span className="text-gray-400 font-normal normal-case text-xs">(optional)</span></label>
            <textarea
            value={requestForm.reason}
            onChange={e => setRequestForm({...requestForm, reason: e.target.value})}
            placeholder="Why is this branch needed?"
            rows={3}
            className={inputClass + ' bg-white resize-none'}
            />
        </div>
        </div>
        <div className="flex gap-3 mt-4">
        <button
            onClick={() => requestBranch.mutate(requestForm)}
            disabled={requestBranch.isPending || !requestForm.name || !requestForm.location}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
            {requestBranch.isPending ? 'Submitting...' : 'Submit Request'}
        </button>
        <button
            onClick={() => setShowRequestForm(false)}
            className="border px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50"
        >
            Cancel
        </button>
        </div>
    </div>
    )}
    </MainLayout>
  )
}

export default BranchManagement