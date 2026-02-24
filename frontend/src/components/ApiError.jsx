function ApiError({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-red-500 text-xl">⚠️</span>
        <p className="text-red-700 text-sm font-medium">
          {error.response?.data?.detail || 'Failed to load data'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-red-600 text-sm font-semibold hover:underline flex-shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default ApiError