import { useQuery } from '@tanstack/react-query'
import FeeStatusBadge from './FeeStatusBadge'
import api from '../api/axios'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function StudentProfileModal({ student, onClose }) {
  const { data: feeHistory, isLoading } = useQuery({
    queryKey: ['student-fees', student.id],
    queryFn: () => api.get(`/fees/student/${student.id}`).then(res => res.data)
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold">{student.full_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Student Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            ['Belt Grade', student.belt_grade],
            ['Date of Birth', student.dob],
            ['Contact', student.contact],
            ['Emergency Contact', student.emergency_contact],
            ['Parent/Guardian', student.parent_name],
            ['Last Graduation', student.last_graduation_date || 'Not set'],
            ['Address', student.address],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-medium capitalize">{value}</p>
            </div>
          ))}
        </div>

        {/* Fee History */}
        <h4 className="font-semibold mb-3">Payment History</h4>
        {isLoading ? <p className="text-gray-500">Loading...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Month</th>
                <th className="text-left px-3 py-2">Year</th>
                <th className="text-left px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Paid On</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {feeHistory?.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-4 text-gray-500">No records</td></tr>
              ) : (
                feeHistory?.map(f => (
                  <tr key={f.id} className="border-t">
                    <td className="px-3 py-2">{MONTHS[f.month - 1]}</td>
                    <td className="px-3 py-2">{f.year}</td>
                    <td className="px-3 py-2">{f.amount ? `Rs.${f.amount}` : '—'}</td>
                    <td className="px-3 py-2">{f.paid_at ? new Date(f.paid_at).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2"><FeeStatusBadge status={f.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
export default StudentProfileModal