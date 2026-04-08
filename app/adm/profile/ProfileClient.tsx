"use client"

import { useState, useRef, useEffect } from 'react'
import { Camera, Save, Loader2, Pencil, X, Building2, FileText, Calendar, Plus, Trash2, MessageCircle, Eye, Send, MoreVertical, Check, IdCard, Download, Gift, CheckCheck } from 'lucide-react'
import QRCode from 'react-qr-code'
// html-to-image will be dynamically imported to avoid SSR issues
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface Reply {
  _id: string
  authorId: string
  authorName: string
  authorPhoto?: string
  content: string
  createdAt: string
  updatedAt?: string
  parentReplyId?: string
  replies: Reply[]
}

interface Comment {
  _id: string
  authorId: string
  authorName: string
  authorPhoto?: string
  content: string
  createdAt: string
  updatedAt?: string
  replies: Reply[]
}

interface Post {
  _id: string
  authorId: string
  authorName: string
  authorPhoto?: string
  description: string
  mediaUrl: string
  mediaType: "image" | "video"
  comments: Comment[]
  views: string[]
  createdAt: string
}

interface EditingState {
  type: "comment" | "reply"
  commentId: string
  replyId?: string
  text: string
}

interface ReplyingState {
  commentId: string
  parentReplyId: string | null
  text: string
}

// Helper for ID comparison
function toStr(val: unknown): string {
  if (!val) return ""
  if (typeof val === "string") return val
  if (typeof val === "object") {
    const o = val as Record<string, unknown>
    if (typeof o.$oid === "string") return o.$oid
    if (typeof (val as any).toString === "function") return (val as any).toString()
  }
  return String(val)
}

interface ProfilePageProps {
  admin: {
    risentaID: string
    adm_usn: string
    photoProfile?: string
    cloudinaryPublicId?: string
    position?: string
    division?: string
    createdAt?: string
    skills?: string[]
  }
  isOwnProfile: boolean
  postCount: number
  posts: Post[]
}

export default function ProfilePageClient({ admin, isOwnProfile, postCount, posts: initialPosts }: ProfilePageProps) {
  const [photoUrl, setPhotoUrl] = useState(admin.photoProfile || '')
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState(admin.cloudinaryPublicId || '')
  const [admUsn, setAdmUsn] = useState(admin.adm_usn || '')
  const [position, setPosition] = useState(admin.position || '')
  const [division, setDivision] = useState(admin.division || '')
  const [skills, setSkills] = useState<string[]>(admin.skills ?? [])
  const [newSkill, setNewSkill] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [showIDCard, setShowIDCard] = useState(false)
  const [copiedReferral, setCopiedReferral] = useState(false)
  const idCardRef = useRef<HTMLDivElement>(null)
  const idCardPrintRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Posts state for interactivity
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<{risentaID: string, _id?: string, adm_usn: string, photoProfile?: string} | null>(null)
  const [currentUserMongoId, setCurrentUserMongoId] = useState<string | null>(null)
  
  // Post editing state
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editText, setEditText] = useState<Record<string, string>>({})
  
  // Comment/reply editing state
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [replying, setReplying] = useState<ReplyingState | null>(null)

  // Fetch current user for commenting
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          if (data.admin) {
            setCurrentUser(data.admin)
            setCurrentUserMongoId(data.admin._id || null)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchCurrentUser()
  }, [])

  // Debug log
  console.log('[ProfileClient] isOwnProfile:', isOwnProfile, 'admin:', admin.risentaID, 'admin.skills:', admin.skills, 'skills state:', skills)

  // Set body data attribute when ID Card modal is open (for navbar styling)
  useEffect(() => {
    if (showIDCard) {
      document.body.setAttribute('data-idcard-open', 'true')
    } else {
      document.body.removeAttribute('data-idcard-open')
    }
    return () => {
      document.body.removeAttribute('data-idcard-open')
    }
  }, [showIDCard])

  // Sync state with props when admin data changes (e.g., navigating between profiles)
  useEffect(() => {
    setPhotoUrl(admin.photoProfile || '')
    setCloudinaryPublicId(admin.cloudinaryPublicId || '')
    setAdmUsn(admin.adm_usn || '')
    setPosition(admin.position || '')
    setDivision(admin.division || '')
    setSkills(admin.skills ?? [])
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

    // Add pending skill if user typed but didn't press Enter
    let skillsToSave = skills
    const trimmed = newSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      skillsToSave = [...skills, trimmed]
      setSkills(skillsToSave)
      setNewSkill('')
    }

    // Debug: log skills state before saving
    console.log('[ProfileClient] Saving profile - skills state:', skillsToSave)

    try {
      const res = await fetch('/api/admin/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risentaID: admin.risentaID,
          adm_usn: admUsn,
          position,
          division,
          skills: skillsToSave,
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
        admin.division = division
        admin.skills = skillsToSave
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
    setDivision(admin.division || '')
    setSkills(admin.skills ?? [])
    setPhotoUrl(admin.photoProfile || '')
    setCloudinaryPublicId(admin.cloudinaryPublicId || '')
    setIsEditing(false)
    setMessage('')
  }

  const addSkill = () => {
    const trimmed = newSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed])
      setNewSkill('')
      console.log('[ProfileClient] Skill added:', trimmed, 'New skills:', [...skills, trimmed])
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove))
  }

  // Post interaction functions
  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  const handleCommentChange = (postId: string, text: string) => {
    setCommentText(prev => ({ ...prev, [postId]: text }))
  }

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId]?.trim()
    if (!text || !currentUser) return

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (res.ok) {
        const data = await res.json()
        setPosts(prev => prev.map(post => 
          post._id === postId 
            ? { ...post, comments: [...post.comments, data.comment] }
            : post
        ))
        setCommentText(prev => ({ ...prev, [postId]: '' }))
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  // Refresh posts data
  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/posts?author=${admin.risentaID}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        if (data.posts) {
          setPosts(data.posts)
        }
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    }
  }

  // Post edit/delete handlers
  const handleEditPost = async (postId: string, newDescription: string) => {
    if (!newDescription.trim()) return
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDescription.trim() }),
      })
      if (res.ok) {
        setPosts(prev => prev.map(post => 
          post._id === postId ? { ...post, description: newDescription.trim() } : post
        ))
        setEditingPost(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Hapus postingan ini?")) return
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" })
      if (res.ok) {
        setPosts(prev => prev.filter(post => post._id !== postId))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const recordView = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/view`, { method: "POST", credentials: "include" })
    } catch (e) {
      console.error(e)
    }
  }

  // Download ID Card function
  const handleDownloadIDCard = async () => {
    console.log('handleDownloadIDCard called, ref:', idCardRef.current)
    
    if (!idCardRef.current) {
      console.error('idCardRef is null')
      alert('Error: ID Card reference not found')
      return
    }
    
    try {
      console.log('Starting html-to-image capture...')
      
      // Dynamically import html-to-image (client-side only)
      const { toPng } = await import('html-to-image')
      
      // Use the print-friendly version (hidden) for capture
      const printElement = idCardPrintRef.current
      if (!printElement) {
        alert('Error: Print version not found')
        return
      }
      
      // Wait for images to load in print version
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      // Capture the print-friendly element
      const dataUrl = await toPng(printElement, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
      })
      
      console.log('Image generated, downloading...')
      const link = document.createElement('a')
      link.download = `ID-Tag-${admUsn.replaceAll(' ', '-')}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log('Download triggered')
    } catch (error) {
      console.error('Failed to download ID card:', error)
      alert('Failed to download ID card. Please try again.')
    }
  }
  const joinedDate = admin.createdAt 
    ? new Date(admin.createdAt).toLocaleDateString('id-ID', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Unknown'

  // Generate referral code from last 3 characters of risentaID + "-GO"
  const referralCode = admin.risentaID 
    ? `${admin.risentaID.slice(-3).toUpperCase()}-GO` 
    : ''

  const handleCopyReferral = async () => {
    if (!referralCode) return
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopiedReferral(true)
      setTimeout(() => setCopiedReferral(false), 2000)
    } catch (err) {
      console.error('Failed to copy referral code:', err)
    }
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

          {/* Skill Tags - Editable */}
          <div className="flex flex-wrap gap-2 mb-6">
            {skills.map((skill) => (
              <span 
                key={skill} 
                className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center gap-2"
              >
                {skill}
                {isEditing && (
                  <button 
                    onClick={() => removeSkill(skill)}
                    className="text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </span>
            ))}
            {isEditing && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  placeholder="Add label..."
                  className="px-3 py-1 w-28 rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={addSkill}
                  className="p-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Stats Row - Updated */}
          <div className="flex items-center justify-between py-4 border-t border-b border-neutral-200 dark:border-neutral-800 mb-6">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-neutral-900 dark:text-white" />
                <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                  {division || position || '-'}
                </span>
              </div>
              <span className="text-neutral-500 dark:text-neutral-400 text-xs">Divisi</span>
            </div>
            <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-neutral-900 dark:text-white" />
                <span className="font-semibold text-neutral-900 dark:text-white text-sm">{postCount}</span>
              </div>
              <span className="text-neutral-500 dark:text-neutral-400 text-xs">Postingan</span>
            </div>
            <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex flex-col items-end gap-1 text-center">
              <span className="font-semibold text-neutral-900 dark:text-white text-xs">{joinedDate}</span>
              <span className="text-neutral-500 dark:text-neutral-400 text-xs">Joined Since</span>
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
                  className="flex-1 py-2 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isUploading}
                  className="px-3 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-semibold rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 bg-white dark:bg-white text-black dark:text-black text-sm rounded-full border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 font-medium"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowIDCard(true)}
                  className="px-3 py-1 bg-neutral-900 dark:bg-neutral-800 text-white dark:text-white text-sm rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 font-medium"
                >
                  <IdCard className="w-3 h-3" />
                  ID Tag
                </button>
                {referralCode && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={handleCopyReferral}
                      className="px-3 py-1 bg-neutral-900 dark:bg-neutral-800 text-white dark:text-white text-sm rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 font-medium"
                    >
                      {copiedReferral ? (
                        <>
                          <CheckCheck className="w-3 h-3" />
                          Tersalin!
                        </>
                      ) : (
                        <>
                          <Gift className="w-3 h-3" />
                          {referralCode}
                        </>
                      )}
                    </button>
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs">Kode Referral</span>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
          
          {/* ID Card Button - For other admins viewing this profile */}
          {!isOwnProfile && (
            <div className="mb-4 flex justify-start gap-2">
              <button
                onClick={() => setShowIDCard(true)}
                className="px-3 py-1 bg-neutral-900 dark:bg-neutral-800 text-white dark:text-white text-sm rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                <IdCard className="w-3 h-3" />
                ID Tag
              </button>
              {referralCode && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleCopyReferral}
                    className="px-3 py-1 bg-neutral-900 dark:bg-neutral-800 text-white dark:text-white text-sm rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 font-medium"
                  >
                    {copiedReferral ? (
                      <>
                        <CheckCheck className="w-3 h-3" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Gift className="w-3 h-3" />
                        {referralCode}
                      </>
                    )}
                  </button>
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs">Kode Referral</span>
                </div>
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

      {/* Posts Section */}
      {posts.length > 0 && (
        <div className="z-10 w-full max-w-md mt-6 px-6 mb-32">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Postingan
          </h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={currentUser?.risentaID || null}
                currentUserMongoId={currentUserMongoId}
                isOwnProfile={isOwnProfile}
                commentText={commentText[post._id] ?? ""}
                showComments={expandedComments[post._id] ?? false}
                onCommentChange={(t) => setCommentText((p) => ({ ...p, [post._id]: t }))}
                onToggleComments={() => setExpandedComments((p) => ({ ...p, [post._id]: !p[post._id] }))}
                onAddComment={() => handleAddComment(post._id)}
                isEditing={editingPost === post._id}
                editText={editText[post._id] ?? ""}
                onEditChange={(t) => setEditText((p) => ({ ...p, [post._id]: t }))}
                onStartEdit={() => {
                  setEditText((p) => ({ ...p, [post._id]: post.description }))
                  setEditingPost(post._id)
                }}
                onCancelEdit={() => setEditingPost(null)}
                onEdit={(t) => handleEditPost(post._id, t)}
                onDelete={() => handleDeletePost(post._id)}
                onView={() => recordView(post._id)}
                onRefresh={fetchPosts}
              />
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 && (
        <div className="z-10 w-full max-w-md mt-6 px-6 mb-32 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">
            Belum ada postingan
          </p>
        </div>
      )}

      {/* ID Card Modal */}
      {showIDCard && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          {/* Click overlay to close - separate from content */}
          <div className="absolute inset-0" onClick={() => setShowIDCard(false)} />
          
          {/* Content container - above overlay and navbar */}
          <div className="relative z-[60] flex flex-col items-center gap-4 pointer-events-none">
            {/* ID Card Container */}
            <div 
              ref={idCardRef}
              className="relative w-full max-w-md bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
            >
              {/* Animated Grid Pattern Background */}
              <div className="absolute inset-0 opacity-30">
                <AnimatedGridPattern
                  numSquares={20}
                  maxOpacity={0.3}
                  duration={3}
                  repeatDelay={1}
                />
              </div>
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center p-8">
                {/* Header */}
                <p className="text-white/80 text-sm font-light tracking-wider mb-6">
                  Meet Our Team
                </p>
                
                {/* Profile Photo */}
                <div className="relative mb-6">
                  <div className="w-40 h-40 rounded-lg overflow-hidden ring-2 ring-white/20 shadow-lg shadow-white/10">
                    <Image 
                      src={photoUrl || `/Assets/tema/${admUsn.replaceAll(' ', '')}.jpeg`}
                      alt={`${admUsn} Profile`}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                </div>
                
                {/* Name */}
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  {admUsn}
                </h2>
                
                {/* Major/Division & Position */}
                <p className="text-blue-300 text-sm text-center mb-4">
                  Divisi {division || 'Risentta'} • {position || 'Team Member'}
                </p>
                
                {/* Description */}
                <div className="w-full max-w-xs mb-8 px-4">
                  <p className="text-white/70 text-xs leading-relaxed text-center">
                    Berkontribusi di divisi {division || 'Risentta'}, {position ? `sebagai ${position}` : 'sebagai bagian dari tim Risentta'}, menciptakan solusi dan inovasi untuk kemajuan bersama.
                  </p>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between w-full mt-auto pt-6 border-t border-white/10">
                  {/* Logo - Matching Navbar Style */}
                  <div className="relative overflow-hidden w-24 h-6 translate-x-2">
                    <Image
                      src="/Assets/logo/logo.jpeg"
                      alt="Risentta Logo"
                      fill
                      className="object-cover position-center scale-125 translate-x-[-8px] invert-0"
                    />
                  </div>
                  
                  {/* QR Code & Website */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Joined {joinedDate}</p>
                    </div>
                    <div className="w-7 h-7 flex items-center justify-center">
                      <QRCode 
                        value={`https://risentta.com/adm/profile?user=${admin.risentaID}`}
                        size={28}
                        bgColor="transparent"
                        fgColor="#ffffff"
                        level="H"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowIDCard(false)}
                className="absolute top-4 right-4 z-50 text-white/60 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Download Button - outside card, properly layered */}
            <button
              onClick={() => {
                console.log('Download button clicked')
                handleDownloadIDCard()
              }}
              className="px-4 py-2 bg-white text-neutral-900 text-sm font-medium rounded-full hover:bg-neutral-100 transition-colors flex items-center gap-2 shadow-lg pointer-events-auto cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download ID Tag
            </button>
            
            {/* Hidden Print-Friendly ID Card for Download */}
            <div 
              ref={idCardPrintRef}
              className="absolute opacity-0 pointer-events-none"
              style={{ 
                width: '400px', 
                height: '600px',
                background: 'linear-gradient(180deg, #172554 0%, #1e3a8a 50%, #0f172a 100%)',
                borderRadius: '16px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                left: '-9999px',
              }}
            >
              {/* Static Grid Background Pattern */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.2,
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                  borderRadius: '16px',
                }}
              />
              
              {/* Header */}
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', letterSpacing: '0.05em', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                Meet Our Team
              </p>
              
              {/* Profile Photo - using standard img */}
              <div style={{ width: '160px', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                <img 
                  src={photoUrl || `/Assets/tema/${admUsn.replaceAll(' ', '')}.jpeg`}
                  alt={`${admUsn} Profile`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  crossOrigin="anonymous"
                />
              </div>
              
              {/* Name */}
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                {admUsn}
              </h2>
              
              {/* Division & Position */}
              <p style={{ color: '#93c5fd', fontSize: '14px', textAlign: 'center', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                Divisi {division || 'Risentta'} • {position || 'Team Member'}
              </p>
              
              {/* Description */}
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: '1.5', textAlign: 'center', maxWidth: '280px', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
                Berkontribusi di divisi {division || 'Risentta'}, {position ? `sebagai ${position}` : 'sebagai bagian dari tim Risentta'}, menciptakan solusi dan inovasi untuk kemajuan bersama.
              </p>
              
              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ width: '96px', height: '24px', position: 'relative' }}>
                  <img
                    src="/Assets/logo/logo.jpeg"
                    alt="Risentta Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    crossOrigin="anonymous"
                  />
                </div>
                
                {/* QR Code & Joined Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Joined {joinedDate}</p>
                  </div>
                  <div style={{ width: '28px', height: '28px' }}>
                    <QRCode 
                      value={`https://risentta.com/adm/profile?user=${admin.risentaID}`}
                      size={28}
                      bgColor="transparent"
                      fgColor="#ffffff"
                      level="H"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
interface PostCardProps {
  post: Post
  currentUserId: string | null
  currentUserMongoId: string | null
  isOwnProfile: boolean
  commentText: string
  showComments: boolean
  onCommentChange: (t: string) => void
  onToggleComments: () => void
  onAddComment: () => void
  isEditing: boolean
  editText: string
  onEditChange: (t: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onEdit: (t: string) => void
  onDelete: () => void
  onView: () => void
  onRefresh: () => void
}

function PostCard({
  post, currentUserId, currentUserMongoId, isOwnProfile,
  commentText, showComments, onCommentChange, onToggleComments, onAddComment,
  isEditing, editText, onEditChange, onStartEdit, onCancelEdit, onEdit,
  onDelete, onView, onRefresh,
}: PostCardProps) {
  const postAuthorId = toStr(post.authorId)
  const isAuthor = isOwnProfile && (postAuthorId === toStr(currentUserId) || postAuthorId === toStr(currentUserMongoId))
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className="relative bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-neutral-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden">
            <Image src={post.authorPhoto ?? "/Assets/default-avatar.png"} alt={post.authorName} fill className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
              <Link href={`/adm/profile?user=${post.authorId}`} className="hover:underline">
                {post.authorName}
              </Link>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: id })}
            </p>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="relative w-full bg-black">
        {post.mediaType === "video" ? (
          <video src={post.mediaUrl} className="w-full h-auto object-contain" controls preload="metadata" />
        ) : (
          <div className="relative w-full aspect-square">
            <Image src={post.mediaUrl} alt="Post media" fill className="object-contain" />
          </div>
        )}
      </div>

      {/* Description */}
      <div className="px-4 py-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea value={editText} onChange={(e) => onEditChange(e.target.value)} className="min-h-[80px] resize-none text-sm" />
            <div className="flex gap-2">
              <Button onClick={() => onEdit(editText)} size="sm" className="flex-1">Simpan</Button>
              <Button variant="outline" onClick={onCancelEdit} size="sm">Batal</Button>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-white font-[inter]">{post.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-4">
          <button onClick={onToggleComments} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <MessageCircle className="w-4 h-4" /><span>{post.comments.length}</span>
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Eye className="w-4 h-4" /><span>{post.views.length} dilihat</span>
          </div>
        </div>
        {isAuthor && !isEditing && (
          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 py-1 z-50 min-w-[120px]">
                <button onClick={(e) => { e.stopPropagation(); onStartEdit(); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
          <CommentSection
            post={post} currentUserId={currentUserId} currentUserMongoId={currentUserMongoId}
            commentText={commentText} onCommentChange={onCommentChange}
            onAddComment={onAddComment} onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  )
}

// ─── CommentSection ────────────────────────────────────────────────────────────
interface CommentSectionProps {
  post: Post
  currentUserId: string | null
  currentUserMongoId: string | null
  commentText: string
  onCommentChange: (t: string) => void
  onAddComment: () => void
  onRefresh: () => void
}

function CommentSection({
  post, currentUserId, currentUserMongoId, commentText, onCommentChange, onAddComment, onRefresh,
}: CommentSectionProps) {
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [replying, setReplying] = useState<ReplyingState | null>(null)

  const put = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/posts/${post._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) onRefresh()
    return res.ok
  }

  const onSaveComment = async (commentId: string, content: string) => {
    if (!content.trim()) return
    if (await put({ commentId, content: content.trim() })) setEditing(null)
  }

  const onDeleteComment = async (commentId: string) => {
    if (!confirm("Hapus komentar ini?")) return
    await put({ commentId, action: "delete" })
  }

  const onSaveReply = async (commentId: string, replyId: string, content: string) => {
    if (!content.trim()) return
    if (await put({ commentId, replyId, content: content.trim() })) setEditing(null)
  }

  const onDeleteReply = async (commentId: string, replyId: string) => {
    if (!confirm("Hapus balasan ini?")) return
    await put({ commentId, replyId, action: "deleteReply" })
  }

  const onSendReply = async () => {
    if (!replying?.text.trim()) return
    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          commentId: replying.commentId,
          content: replying.text.trim(),
          parentReplyId: replying.parentReplyId,
        }),
      })
      if (res.ok) { setReplying(null); onRefresh() }
    } catch (e) { console.error(e) }
  }

  const sharedProps = {
    postId: post._id, currentUserId, currentUserMongoId,
    editing, replying,
    setEditing, setReplying,
    onSaveComment, onDeleteComment,
    onSaveReply, onDeleteReply, onSendReply,
  }

  return (
    <div className="px-4 py-3">
      <div className="max-h-[480px] overflow-y-auto mb-3">
        {post.comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">Belum ada komentar</p>
        ) : (
          post.comments.map((comment) => (
            <CommentRow key={comment._id} comment={comment} {...sharedProps} />
          ))
        )}
      </div>
      {/* New comment */}
      <div className="flex gap-2 items-center pt-2 border-t border-gray-200 dark:border-neutral-700">
        <Textarea
          value={commentText}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Tulis komentar..."
          className="h-10 min-h-[40px] flex-1 resize-none text-sm py-2"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAddComment() } }}
        />
        <Button onClick={onAddComment} disabled={!commentText.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Tree Props ──────────────────────────────────────────────────────────────
interface TreeProps {
  postId: string
  currentUserId: string | null
  currentUserMongoId: string | null
  editing: EditingState | null
  replying: ReplyingState | null
  setEditing: (v: EditingState | null) => void
  setReplying: React.Dispatch<React.SetStateAction<ReplyingState | null>>
  onSaveComment: (commentId: string, content: string) => void
  onDeleteComment: (commentId: string) => void
  onSaveReply: (commentId: string, replyId: string, content: string) => void
  onDeleteReply: (commentId: string, replyId: string) => void
  onSendReply: () => void
}

// ─── CommentRow ───────────────────────────────────────────────────────────────
function CommentRow({ comment, ...props }: { comment: Comment } & TreeProps) {
  const commentAuthorId = toStr(comment.authorId)
  const isAuthor = commentAuthorId === toStr(props.currentUserId) || commentAuthorId === toStr(props.currentUserMongoId)
  const isEditing = props.editing?.type === "comment" && props.editing.commentId === comment._id
  const isReplying = props.replying?.commentId === comment._id && props.replying.parentReplyId === null
  const hasReplies = (comment.replies?.length ?? 0) > 0

  return (
    <div className="flex mb-4">
      {/* Avatar container */}
      <div className="flex-shrink-0 mr-3 pt-3">
        <div className="relative rounded-full overflow-hidden border-2 border-gray-100 dark:border-neutral-700 shadow-sm" style={{ width: 36, height: 36 }}>
          <Image src={comment.authorPhoto ?? "/Assets/default-avatar.png"} alt={comment.authorName} fill className="object-cover" />
        </div>
      </div>

      {/* Konten kanan */}
      <div className="flex-1 min-w-0 pt-3 pb-1">
        <div className="mb-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Link href={`/adm/profile?user=${comment.authorId}`} className="hover:underline">
              {comment.authorName}
            </Link>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: id })}
            {comment.updatedAt && <span className="ml-1 italic">(diedit)</span>}
          </div>
        </div>

        {isEditing ? (
          <InlineEditForm
            initialText={props.editing!.text}
            onSave={(t) => props.onSaveComment(comment._id, t)}
            onCancel={() => props.setEditing(null)}
          />
        ) : (
          <p className="text-sm text-gray-800 dark:text-gray-100 break-words leading-relaxed">{comment.content}</p>
        )}

        {!isEditing && (
          <div className="flex items-center gap-3 mt-1.5 mb-1">
            <button
              onClick={() => isReplying
                ? props.setReplying(null)
                : props.setReplying({ commentId: comment._id, parentReplyId: null, text: "" })}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isReplying ? "Batal" : "Balas"}
            </button>
            {isAuthor && (
              <>
                <button
                  onClick={() => props.setEditing({ type: "comment", commentId: comment._id, text: comment.content })}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >Edit</button>
                <button onClick={() => props.onDeleteComment(comment._id)} className="text-xs text-red-500 hover:text-red-600">Hapus</button>
              </>
            )}
          </div>
        )}

        {isReplying && (
          <ReplyInput
            placeholder="Balas komentar..."
            value={props.replying!.text}
            onChange={(t) => props.setReplying((p) => p ? { ...p, text: t } : null)}
            onSend={props.onSendReply}
            onCancel={() => props.setReplying(null)}
          />
        )}

        {hasReplies && (
          <div className="mt-6 space-y-4">
            {comment.replies.map((reply) => (
              <ReplyItem
                key={reply._id}
                reply={reply}
                commentId={comment._id}
                parentContent={comment.content}
                {...props}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ReplyItem ───────────────────────────────────────────────────────────────
interface ReplyItemProps extends TreeProps {
  reply: Reply
  commentId: string
  parentContent: string
}

function ReplyItem({ reply, commentId, parentContent, ...props }: ReplyItemProps) {
  const replyAuthorId = toStr(reply.authorId)
  const isReplyAuthor = replyAuthorId === toStr(props.currentUserId) || replyAuthorId === toStr(props.currentUserMongoId)
  const isEditing = props.editing?.type === "reply" && props.editing.replyId === reply._id
  const isReplying = props.replying?.commentId === commentId && props.replying?.parentReplyId === reply._id
  const hasNested = (reply.replies?.length ?? 0) > 0

  return (
    <div className="mb-4">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-shrink-0">
          <div className="relative rounded-full overflow-hidden border border-gray-200 dark:border-neutral-600 flex-shrink-0" style={{ width: 28, height: 28 }}>
            <Image src={reply.authorPhoto ?? "/Assets/default-avatar.png"} alt={reply.authorName} fill className="object-cover" />
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Link href={`/adm/profile?user=${reply.authorId}`} className="hover:underline">
              {reply.authorName}
            </Link>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: id })}
            {reply.updatedAt && <span className="ml-1 italic">(diedit)</span>}
          </div>
        </div>
      </div>

      <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
        <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-3">{parentContent}</p>
      </div>

      {isEditing ? (
        <InlineEditForm
          initialText={props.editing!.text}
          onSave={(t) => props.onSaveReply(commentId, reply._id, t)}
          onCancel={() => props.setEditing(null)}
        />
      ) : (
        <p className="text-sm text-gray-800 dark:text-gray-100 break-words leading-relaxed">{reply.content}</p>
      )}

      {!isEditing && (
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={() => isReplying
              ? props.setReplying(null)
              : props.setReplying({ commentId, parentReplyId: reply._id, text: "" })}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isReplying ? "Batal" : "Balas"}
          </button>
          {isReplyAuthor && (
            <>
              <button
                onClick={() => props.setEditing({ type: "reply", commentId, replyId: reply._id, text: reply.content })}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >Edit</button>
              <button onClick={() => props.onDeleteReply(commentId, reply._id)} className="text-xs text-red-500 hover:text-red-600">Hapus</button>
            </>
          )}
        </div>
      )}

      {isReplying && (
        <ReplyInput
          placeholder={`Balas ${reply.authorName}...`}
          value={props.replying!.text}
          onChange={(t) => props.setReplying((p) => p ? { ...p, text: t } : null)}
          onSend={props.onSendReply}
          onCancel={() => props.setReplying(null)}
        />
      )}

      {hasNested && (
        <div className="mt-4 space-y-4">
          {reply.replies.map((nestedReply) => (
            <ReplyItem
              key={nestedReply._id}
              reply={nestedReply}
              commentId={commentId}
              parentContent={reply.content}
              {...props}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── InlineEditForm ───────────────────────────────────────────────────────────
function InlineEditForm({ initialText, onSave, onCancel }: {
  initialText: string
  onSave: (t: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initialText)
  return (
    <div className="mt-1 space-y-1.5">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[56px] resize-none text-sm py-1.5"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSave(text) }
          if (e.key === "Escape") onCancel()
        }}
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => onSave(text)} disabled={!text.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
        >
          <Check className="w-3 h-3" /> Simpan
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <X className="w-3 h-3" /> Batal
        </button>
      </div>
    </div>
  )
}

// ─── ReplyInput ───────────────────────────────────────────────────────────────
function ReplyInput({ placeholder, value, onChange, onSend, onCancel }: {
  placeholder: string
  value: string
  onChange: (t: string) => void
  onSend: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex gap-2 items-center mt-2 mb-1">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 min-h-[36px] flex-1 resize-none text-sm py-2"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() }
          if (e.key === "Escape") onCancel()
        }}
      />
      <Button onClick={onSend} disabled={!value.trim()} size="icon" className="h-9 w-9 flex-shrink-0">
        <Send className="w-4 h-4" />
      </Button>
    </div>
  )
}
