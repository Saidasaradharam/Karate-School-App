import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import api from '../api/axios'

function Photos() {
  const queryClient = useQueryClient()
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const { data: photos, isLoading } = useQuery({
    queryKey: ['photos'],
    queryFn: () => api.get('/photos/').then(res => res.data)
  })

  const uploadPhoto = useMutation({
    mutationFn: (file) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/photos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => queryClient.invalidateQueries(['photos'])
  })

  const deletePhoto = useMutation({
    mutationFn: (id) => api.delete(`/photos/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['photos'])
  })

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadPhoto.mutate(file)
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (file) uploadPhoto.mutate(file)
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Photos</h2>
      </div>

      {/* Drag and Drop Upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer mb-6 transition-colors ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        {uploadPhoto.isPending ? (
          <p className="text-gray-500">Uploading...</p>
        ) : (
          <>
            <p className="text-4xl mb-2">📸</p>
            <p className="text-gray-600 font-medium">Drag and drop an image here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse — photos expire after 7 days</p>
          </>
        )}
      </div>

      {/* Photos Grid */}
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : photos?.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No photos yet</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos?.map(photo => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden shadow">
              <img src={photo.file_url} alt="photo" className="w-full h-48 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                <p className="text-xs">{photo.days_remaining}d {photo.hours_remaining}h left</p>
              </div>
              <button
                onClick={() => deletePhoto.mutate(photo.id)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  )
}

export default Photos