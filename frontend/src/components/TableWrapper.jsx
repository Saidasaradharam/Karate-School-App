function TableWrapper({ children }) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  )
}

export default TableWrapper