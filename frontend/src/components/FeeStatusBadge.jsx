function FeeStatusBadge({ status }) {
  if (status === 'paid_online' || status === 'paid_offline') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          Paid
        </span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          {status === 'paid_online' ? 'Online' : 'Offline'}
        </span>
      </div>
    )
  }

  const map = {
    pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
    rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-800' },
    no_record: { label: 'No Record', classes: 'bg-gray-100 text-gray-500' },
  }

  const config = map[status] || { label: status, classes: 'bg-gray-100 text-gray-500' }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.classes}`}>
      {config.label}
    </span>
  )
}

export default FeeStatusBadge