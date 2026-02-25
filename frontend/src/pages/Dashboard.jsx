import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import FeeStatusBadge from '../components/FeeStatusBadge'
import api from '../api/axios'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const BELT_COLORS = {
  white: '#f8f8f8', yellow: '#fde047', blue: '#3b82f6',
  orange: '#f97316', purple: '#a855f7', green: '#22c55e',
  brown: '#92400e', black: '#111827'
}

function getBeltColor(grade) {
  const base = grade?.split('-')[0]
  return BELT_COLORS[base] || '#6b7280'
}

function Dashboard() {
  const queryClient = useQueryClient()
  const { toasts, showToast } = useToast()  

  const { data: promotionRequest } = useQuery({
    queryKey: ['my-promotion-request'],
    queryFn: () => api.get('/admins/promotion-requests/my-request').then(res => res.data).catch(() => null)
  })

  const requestPromotion = useMutation({
    mutationFn: (reason) => api.post('/admins/promotion-requests', { reason }),
    onSuccess: () => {
      showToast('Promotion request submitted!')
      queryClient.invalidateQueries(['my-promotion-request'])
    },
    onError: (err) => showToast(err.response?.data?.detail || 'Failed to submit', 'error')
  })

  const [showPromotionForm, setShowPromotionForm] = useState(false)
  const [promotionReason, setPromotionReason] = useState('')
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/students/me').then(res => res.data)
  })

  const { data: feeRecords, isLoading: feeLoading } = useQuery({
    queryKey: ['my-fees'],
    queryFn: () => api.get('/fees/my-status').then(res => res.data)
  })

  const now = new Date()
  const currentMonthFee = feeRecords?.find(
    f => f.month === now.getMonth() + 1 && f.year === now.getFullYear()
  )

  if (profileLoading) return <MainLayout><p>Loading...</p></MainLayout>

  return (
    <MainLayout>
      <Toast toasts={toasts} />

      {/* Hero Header */}
      <div className="relative bg-gray-900 rounded-2xl p-8 mb-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px'
          }}
        />
        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-white text-gray-900 flex items-center justify-center text-3xl font-black shadow-lg flex-shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-gray-400 text-sm font-medium mb-1">Welcome back</p>
            <h2 className="text-2xl font-black text-white tracking-tight">{profile?.full_name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-3 rounded-full shadow-inner border border-white border-opacity-20"
                  style={{ backgroundColor: getBeltColor(profile?.belt_grade) }}
                />
                <span className="text-sm text-gray-300 capitalize font-medium">{profile?.belt_grade} belt</span>
              </div>
              {profile?.last_graduation_date && (
                <span className="text-gray-500 text-sm">· Last promoted {profile?.last_graduation_date}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Belt Grade</p>
          <p className="text-2xl font-bold capitalize">{profile?.belt_grade || '—'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Fee Status — {now.toLocaleString('default', { month: 'long' })} {now.getFullYear()}
          </p>
          <div className="mt-2">
            {feeLoading ? <p>Loading...</p> : (
              <FeeStatusBadge status={currentMonthFee?.status || 'no_record'} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Graduation</p>
          <p className="text-2xl font-bold">{profile?.last_graduation_date || 'Not set'}</p>
        </div>
      </div>

      {/* Promotion Request Card */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h3 className="font-bold mb-1">Want to become an Admin?</h3>
        <p className="text-sm text-gray-500 mb-3">Request admin privileges from the super admin</p>

        {promotionRequest?.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-sm text-yellow-800 font-medium">⏳ Promotion request pending review</p>
          </div>
        )}

        {promotionRequest?.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-sm text-green-800 font-medium">✅ Your promotion was approved!</p>
          </div>
        )}

        {promotionRequest?.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
            <p className="text-sm text-red-800 font-medium">❌ Request rejected{promotionRequest.rejection_reason ? `: ${promotionRequest.rejection_reason}` : ''}</p>
          </div>
        )}

        {(!promotionRequest || promotionRequest?.status === 'rejected') && (
          <>
            {showPromotionForm ? (
              <div className="space-y-3">
                <textarea
                  value={promotionReason}
                  onChange={e => setPromotionReason(e.target.value)}
                  placeholder="Why do you want to become an admin? (optional)"
                  rows={3}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => requestPromotion.mutate(promotionReason)}
                    disabled={requestPromotion.isPending}
                    className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {requestPromotion.isPending ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    onClick={() => setShowPromotionForm(false)}
                    className="flex-1 border py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPromotionForm(true)}
                className="w-full border border-gray-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50"
              >
                Request Admin Role
              </button>
            )}
          </>
        )}
      </div>

    </MainLayout>
  )
}

export default Dashboard