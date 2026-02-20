function FeeStatusBadge({ status }) {
  const styles = {
    paid_online: 'bg-green-100 text-green-800',
    paid_offline: 'bg-green-100 text-green-800',
    pending: 'bg-red-100 text-red-800',
    rejected: 'bg-orange-100 text-orange-800',
    no_record: 'bg-gray-100 text-gray-800',
  }

  const labels = {
    paid_online: 'Paid Online',
    paid_offline: 'Paid Offline',
    pending: 'Pending',
    rejected: 'Rejected',
    no_record: 'No Record',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  )
}

export default FeeStatusBadge