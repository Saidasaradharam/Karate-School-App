import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../layouts/MainLayout'
import api from '../api/axios'

function getTimeRemaining(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  if (diff <= 0) return { expired: true, label: 'Expired' }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const expiringSoon = diff < 1000 * 60 * 60 * 24 // less than 24 hours
  return {
    expired: false,
    expiringSoon,
    label: days > 0 ? `${days}d ${hours}h left` : `${hours}h left`
  }
}

function ConfirmDownloadDialog({ photo, onConfirm, onCancel }) {
  const time = getTimeRemaining(photo.expires_at)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Download Photo</h3>
        <p className="text-gray-500 text-sm mb-6">
          {time.expiringSoon
            ? `⚠️ This photo expires in ${time.label}. Download it before it's gone!`
            : `This photo will expire in ${time.label}.`
          }
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            Download
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function Photos() {
  const queryClient = useQueryClient()
  const [dragging, setDragging] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [confirmPhoto, setConfirmPhoto] = useState(null)
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
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total)
          setUploadProgress(pct)
        }
      })
    },
    onSuccess: (res) => {
      // Optimistic — add immediately to cache
      queryClient.setQueryData(['photos'], old => [res.data, ...(old || [])])
      setShowUploadModal(false)
      setPreviewUrl(null)
      setSelectedFile(null)
      setUploadProgress(0)
    },
    onError: () => {
      setUploadProgress(0)
    }
  })

  const deletePhoto = useMutation({
    mutationFn: (id) => api.delete(`/photos/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['photos'], old => old?.filter(p => p.id !== id))
    }
  })

  function handleFileSelect(file) {
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setShowUploadModal(true)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  async function handleDownload(photo) {
  try {
    const response = await fetch(photo.file_url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `photo-${photo.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch {
    // Fallback to new tab if fetch fails
    window.open(photo.file_url, '_blank')
  }
  setConfirmPhoto(null)
}

  function closeUploadModal() {
    setShowUploadModal(false)
    setPreviewUrl(null)
    setSelectedFile(null)
    setUploadProgress(0)
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Photo Gallery</h2>
          <p className="text-sm text-gray-500 mt-1">Photos expire after 7 days</p>
        </div>
        <button
          onClick={() => fileInputRef.current.click()}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors"
        >
          + Upload Photo
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={e => handleFileSelect(e.target.files[0])}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center mb-6 transition-all ${
          dragging
            ? 'border-gray-900 bg-gray-50 scale-[1.01]'
            : 'border-gray-200 hover:border-gray-400'
        }`}
      >
        <p className="text-3xl mb-2">📸</p>
        <p className="text-gray-500 text-sm">Drag and drop a photo here to upload</p>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🖼️</p>
          <p>No photos yet — be the first to upload!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map(photo => {
            const time = getTimeRemaining(photo.expires_at)
            return (
              <div
                key={photo.id}
                className={`relative group bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${
                  time.expiringSoon
                    ? 'border-red-400 shadow-red-100'
                    : 'border-transparent hover:border-gray-200'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-52 overflow-hidden bg-gray-100">
                  <img
                    src={photo.file_url}
                    alt="gallery"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Expiring soon warning */}
                  {time.expiringSoon && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                      ⚠️ Expiring soon
                    </div>
                  )}
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => !time.expired && setConfirmPhoto(photo)}
                      disabled={time.expired}
                      className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-100 transition-colors"
                    >
                      ⬇ Download
                    </button>
                    <button
                      onClick={() => deletePhoto.mutate(photo.id)}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                      {new Date(photo.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      time.expired
                        ? 'bg-gray-100 text-gray-400'
                        : time.expiringSoon
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {time.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Upload Photo</h3>

            {/* Preview */}
            <div className="rounded-xl overflow-hidden h-56 bg-gray-100 mb-4">
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            </div>

            {/* Progress bar */}
            {uploadPhoto.isPending && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => uploadPhoto.mutate(selectedFile)}
                disabled={uploadPhoto.isPending}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {uploadPhoto.isPending ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={closeUploadModal}
                disabled={uploadPhoto.isPending}
                className="flex-1 border border-gray-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Confirmation Dialog */}
      {confirmPhoto && (
        <ConfirmDownloadDialog
          photo={confirmPhoto}
          onConfirm={() => handleDownload(confirmPhoto)}
          onCancel={() => setConfirmPhoto(null)}
        />
      )}
    </MainLayout>
  )
}

export default Photos