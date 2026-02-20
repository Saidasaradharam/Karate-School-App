function Toast({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded shadow-lg text-white text-sm ${t.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
export default Toast