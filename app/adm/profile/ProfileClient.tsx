"use client"

import { useState, useRef } from 'react'
import { Camera, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'

interface ProfilePageProps {
  admin: {
    risentaID: string
    adm_usn: string
    photoProfile?: string
    position?: string
  }
}

export default function ProfilePageClient({ admin }: ProfilePageProps) {
  const [photoUrl, setPhotoUrl] = useState(admin.photoProfile || '')
  const [position, setPosition] = useState(admin.position || '')
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert file to base64 for MongoDB storage
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setPhotoUrl(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handleSavePosition = async () => {
    setIsUploading(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risentaID: admin.risentaID,
          position,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('Position updated successfully!')
      } else {
        setMessage(data.message || 'Failed to update position')
      }
    } catch (error) {
      setMessage('Error updating position')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSavePhoto = async () => {
    setIsUploading(true)
    setMessage('')

    try {
      // Check if photoUrl is a base64 data URL
      let photoProfileBuffer = null
      let photoProfileContentType = null
      let photoProfileUrl = photoUrl

      if (photoUrl && photoUrl.startsWith('data:image')) {
        // Extract content type and base64 data
        const matches = photoUrl.match(/^data:(image\/\w+);base64,(.+)$/)
        if (matches) {
          photoProfileContentType = matches[1]
          photoProfileBuffer = matches[2]
          // Keep the data URL for immediate display
        }
      }

      const res = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risentaID: admin.risentaID,
          photoProfile: photoProfileUrl,
          photoProfileBuffer,
          photoProfileContentType,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('Profile updated successfully!')
      } else {
        setMessage(data.message || 'Failed to update profile')
      }
    } catch (error) {
      setMessage('Error updating profile')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Background Pattern */}
      <div className='opacity-30 absolute inset-0'>
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.1}
          duration={3}
          repeatDelay={1}
        />
      </div>

      {/* Profile Card */}
      <div className="z-10 w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col items-center gap-6">
          {/* Profile Photo with Upload */}
          <div className="relative">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500">
              <img 
                src={photoUrl || `/Assets/tema/${admin.adm_usn.replaceAll(' ', '')}.jpeg`}
                alt={`${admin.adm_usn} Profile`}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <Camera size={18} />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Admin Info */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {admin.adm_usn}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              ID: {admin.risentaID}
            </p>
          </div>

          {/* Position Input */}
          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Position / Role
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Law & Software Engineer"
              className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Photo URL Input - now also supports base64 */}
          {/* <div className="w-full space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Profile Photo URL atau Upload File
            </label>
            <input
              type="text"
              value={photoUrl.startsWith('data:') ? 'Gambar tersimpan di database' : photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Enter image URL or upload file"
              disabled={photoUrl.startsWith('data:')}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500">
              Klik ikon kamera untuk upload gambar (akan disimpan di MongoDB sebagai BSON Binary)
            </p>
          </div> */}

          {/* Save Position Button */}
          <Button 
            onClick={handleSavePosition}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Position
          </Button>

          {/* Save Photo Button */}
          <Button 
            onClick={handleSavePhoto}
            disabled={isUploading}
            variant="outline"
            className="w-full"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            Save Photo
          </Button>

          {/* Message */}
          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          {/* Stats or Info */}
          {/* <div className="w-full grid grid-cols-2 gap-4 mt-4">
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Role</p>
              <p className="font-semibold text-neutral-900 dark:text-white capitalize">Admin</p>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Status</p>
              <p className="font-semibold text-green-600 dark:text-green-400">Active</p>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}
