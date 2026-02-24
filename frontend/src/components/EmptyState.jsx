function EmptyState({ emoji = '📭', title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <p className="text-4xl">{emoji}</p>
      <p className="font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
    </div>
  )
}

export default EmptyState