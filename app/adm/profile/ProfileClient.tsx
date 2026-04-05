"use client"

import { useState, useRef, useEffect } from 'react'
import { Camera, Save, Loader2, Star, Briefcase, Pencil, X } from 'lucide-react'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'

interface ProfilePageProps {
  admin: {
    risentaID: string
    adm_usn: string
    photoProfile?: string
    cloudinaryPublicId?: string
    position?: string
  }
  isOwnProfile: boolean
}

export default function ProfilePageClient({ admin, isOwnProfile }: ProfilePageProps) {
  const [photoUrl, setPhotoUrl] = useState(admin.photoProfile || '')
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState(admin.cloudinaryPublicId || '')
  const [admUsn, setAdmUsn] = useState(admin.adm_usn || '')
  const [position, setPosition] = useState(admin.position || '')
  const [isUploading, setIsUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debug log
  console.log('[ProfileClient] isOwnProfile:', isOwnProfile, 'admin:', admin.risentaID)

  // Sync state with props when admin data changes (e.g., navigating between profiles)
  useEffect(() => {
    setPhotoUrl(admin.photoProfile || '')
    setCloudinaryPublicId(admin.cloudinaryPublicId || '')
    setAdmUsn(admin.adm_usn || '')
    setPosition(admin.position || '')
    setIsEditing(false)
    setMessage('')
  }, [admin.risentaID])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setMessage('Uploading...')

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string
      setPhotoUrl(base64String)

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64String,
            folder: 'risenta-profiles',
          }),
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          setMessage(uploadData.message || 'Failed to upload to Cloudinary')
          setIsUploading(false)
          return
        }

        const finalPhotoUrl = uploadData.url
        const finalPublicId = uploadData.publicId
        setPhotoUrl(finalPhotoUrl)
        setCloudinaryPublicId(finalPublicId)

        const res = await fetch('/api/admin/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            risentaID: admin.risentaID,
            photoProfile: finalPhotoUrl,
            cloudinaryPublicId: finalPublicId,
          }),
        })

        const data = await res.json()

        if (res.ok) {
          setMessage('Photo updated successfully!')
        } else {
          setMessage(data.message || 'Failed to update profile')
        }
      } catch (error) {
        setMessage('Error updating photo')
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    setIsUploading(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risentaID: admin.risentaID,
          adm_usn: admUsn,
          position,
          photoProfile: photoUrl,
          cloudinaryPublicId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('Profile updated successfully!')
        setIsEditing(false)
        // Update local admin data
        admin.adm_usn = admUsn
        admin.position = position
        admin.photoProfile = photoUrl
        admin.cloudinaryPublicId = cloudinaryPublicId
      } else {
        setMessage(data.message || 'Failed to update profile')
      }
    } catch (error) {
      setMessage('Error updating profile')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset to original values
    setAdmUsn(admin.adm_usn)
    setPosition(admin.position || '')
    setPhotoUrl(admin.photoProfile || '')
    setCloudinaryPublicId(admin.cloudinaryPublicId || '')
    setIsEditing(false)
    setMessage('')
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center relative overflow-hidden font-[inter]">
      {/* Background Pattern - Global */}
      {/* <div className='opacity-30 absolute inset-0'>
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.1}
          duration={3}
          repeatDelay={1}
        />
      </div> */}

      {/* Profile Card - Reference Style */}
      <div className="z-10 w-full max-w-md bg-white dark:bg-black md:rounded-2xl md:shadow-xl overflow-hidden md:border md:border-neutral-200 dark:md:border-neutral-800 md:mt-16">
        
        {/* Cover Image Area with AnimatedGridPattern */}
        <div className="relative h-42 w-full overflow-hidden">
          <div className="absolute inset-0 opacity-60">
            <AnimatedGridPattern
              numSquares={30}
              maxOpacity={0.3}
              duration={3}
              repeatDelay={1}
            />
          </div>
          {/* Gradient overlay dari bawah ke atas - matching dashboard style */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Content Area */}
        <div className="relative px-6 pb-6">
          
          {/* Avatar + Name/Position - Flex Row */}
          <div className="relative -mt-16 mb-4 flex flex-row items-end gap-4">
            {/* Avatar - Overlapping cover */}
            <div className="relative">
              <div className="relative inline-block">
                {/* Avatar Image */}
                <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 shadow-lg bg-white dark:bg-neutral-800 ">
                  <img 
                    src={photoUrl || `/Assets/tema/${admUsn.replaceAll(' ', '')}.jpeg`}
                    alt={`${admUsn} Profile`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Upload Button - Only show in edit mode */}
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full shadow-md transition-colors"
                  >
                    <Camera size={14} />
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name & Position Display */}
            <div className="nd:mb-4 mb-2 flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <input
                      type="text"
                      value={admUsn}
                      onChange={(e) => setAdmUsn(e.target.value)}
                      placeholder="Enter name"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Position"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="md:text-2xl text-xl font-bold text-neutral-900 dark:text-white">
                    {admUsn}
                  </h1>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    {position || 'Admin'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Skill Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm rounded-full border border-neutral-200 dark:border-neutral-700">
              Admin
            </span>
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm rounded-full border border-neutral-200 dark:border-neutral-700">
              Management
            </span>
            <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm rounded-full border border-neutral-200 dark:border-neutral-700">
              +1
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between py-4 border-t border-b border-neutral-200 dark:border-neutral-800 mb-6">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-neutral-900 dark:text-white fill-current" />
              <span className="font-semibold text-neutral-900 dark:text-white">4.8</span>
              <span className="text-neutral-500 dark:text-neutral-400 text-sm">Rating</span>
            </div>
            <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-neutral-900 dark:text-white" />
              <span className="font-semibold text-neutral-900 dark:text-white">127</span>
              <span className="text-neutral-500 dark:text-neutral-400 text-sm">Projects</span>
            </div>
            <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />
            <div className="text-right">
              <span className="font-semibold text-neutral-900 dark:text-white">${admin.risentaID.slice(-3)}</span>
              <span className="text-neutral-500 dark:text-neutral-400 text-sm block">ID Rate</span>
            </div>
          </div>

            {/* Edit / Save / Cancel Buttons - Only for own profile */}
          {isOwnProfile && (
          <div className="mb-4">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={isUploading}
                  className="flex-1 py-3 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isUploading}
                  className="px-4 py-3 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-semibold rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-5 h-5" />
                Edit Profile
              </button>
            )}
          </div>
          )}

          {/* Message */}
          {message && (
            <p className={`text-sm text-center mb-4 ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
