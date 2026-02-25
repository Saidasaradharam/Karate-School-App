import { useAdminBranches } from '../hooks/useAdminBranches'

function BranchSelector({ selectedBranch, onChange }) {
  const branches = useAdminBranches()

  if (branches.length <= 1) return null

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 mb-6">
      <span className="text-sm font-semibold text-gray-500 flex-shrink-0">Viewing Branch:</span>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedBranch === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Branches
        </button>
        {branches.map(b => (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedBranch === b.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BranchSelector