import { useQuery } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import FeeStatusBadge from '../components/FeeStatusBadge'
import api from '../api/axios'

function Dashboard() {
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
      <h2 className="text-2xl font-bold mb-6">My Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Belt Grade Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">Belt Grade</p>
          <p className="text-2xl font-bold capitalize">{profile?.belt_grade || '—'}</p>
        </div>

        {/* Fee Status Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">Fee Status — {now.toLocaleString('default', { month: 'long' })} {now.getFullYear()}</p>
          <div className="mt-2">
            {feeLoading ? <p>Loading...</p> : (
              <FeeStatusBadge status={currentMonthFee?.status || 'no_record'} />
            )}
          </div>
        </div>

        {/* Last Graduation Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">Last Graduation Date</p>
          <p className="text-2xl font-bold">{profile?.last_graduation_date || 'Not set'}</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default Dashboard