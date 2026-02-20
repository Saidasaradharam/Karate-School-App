import { useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  function showToast(message, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  return { toasts, showToast }
}