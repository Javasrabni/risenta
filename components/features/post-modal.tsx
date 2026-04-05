"use client"

import React, { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { X, Upload, Image as ImageIcon, Film, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface PostModalProps {
  onClose: () => void
}

// Compress image before upload
async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    
    img.onload = () => {
      let { width, height } = img
      
      // Resize if larger than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Compression failed"))
        },
        "image/jpeg",
        quality
      )
    }
    
    img.onerror = () => reject(new Error("Image load failed"))
    img.src = URL.createObjectURL(file)
  })
}

export default function PostModal({ onClose }: PostModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isCompressing, setIsCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/webp",
    "video/mp4"
  ]

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

  const processFile = useCallback(async (selectedFile: File) => {
    // Check file type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      alert(`Format file tidak didukung. Format yang didukung: JPG, JPEG, PNG, MP4`)
      return
    }

    // Check file size
    const maxSize = selectedFile.type.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (selectedFile.size > maxSize) {
      alert(`File terlalu besar. Maksimum ${selectedFile.type.startsWith("video/") ? "100MB" : "10MB"}`)
      return
    }

    // Compress images before upload (if > 2MB)
    if (selectedFile.type.startsWith("image/") && selectedFile.size > 2 * 1024 * 1024) {
      setIsCompressing(true)
      try {
        const compressedBlob = await compressImage(selectedFile)
        const compressedFile = new File([compressedBlob], selectedFile.name, {
          type: "image/jpeg",
          lastModified: Date.now()
        })
        setFile(compressedFile)
        setPreview(URL.createObjectURL(compressedBlob))
      } catch (error) {
        console.error("Compression failed:", error)
        setFile(selectedFile)
        setPreview(URL.createObjectURL(selectedFile))
      } finally {
        setIsCompressing(false)
      }
    } else {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    processFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (!droppedFile) return
    processFile(droppedFile)
  }

  const handleSubmit = async () => {
    if (!file || !description.trim()) {
      alert("Mohon upload file dan isi deskripsi")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    // Create abort controller for cancellation
    abortRef.current = new AbortController()

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("description", description)

      // Use XMLHttpRequest for real progress tracking
      const xhr = new XMLHttpRequest()
      
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(progress)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener("error", () => reject(new Error("Upload failed")))
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))

        xhr.open("POST", "/api/posts")
        xhr.send(formData)
      })

      await uploadPromise

      onClose()
      window.location.reload()
    } catch (error) {
      if (error instanceof Error && error.message === "Upload cancelled") {
        return
      }
      console.error("Error creating post:", error)
      alert("Gagal membuat postingan. Silakan coba lagi.")
    } finally {
      setIsUploading(false)
      abortRef.current = null
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    onClose()
  }

  const isVideo = file?.type.startsWith("video/")

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
        <h2 className="font-[inter] text-xl font-semibold text-slate-900 dark:text-white">
          Buat Postingan
        </h2>
        <button
          onClick={handleCancel}
          disabled={isUploading}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Upload Area */}
        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer",
              "border-gray-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-500",
              "transition-colors",
              isCompressing && "opacity-50 pointer-events-none"
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                <ImageIcon className="w-8 h-8 text-gray-400" />
                <Film className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-center max-w-sm text-slate-600 dark:text-white font-[inter]">
                  {isCompressing ? "Mengkompres gambar..." : "Klik atau drag file ke sini"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-[inter]">
                  JPG, PNG, WEBP, MP4 (Max 100MB video, 10MB foto)
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isCompressing || isUploading}
            />
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-black">
            {isVideo ? (
              <video
                src={preview}
                className="w-full h-64 object-contain"
                controls
              />
            ) : (
              <Image
                src={preview}
                alt="Preview"
                width={400}
                height={300}
                className="w-full h-64 object-contain"
              />
            )}
            <button
              onClick={() => {
                setFile(null)
                setPreview(null)
              }}
              disabled={isUploading}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-white mb-2 font-[inter]">
            Deskripsi
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tulis deskripsi postingan..."
            className="min-h-[100px] resize-none"
            disabled={isUploading}
          />
        </div>

        {/* Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-400 font-[inter]">
                {uploadProgress < 100 ? "Mengupload..." : "Menyimpan..."}
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-[inter]">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!file || !description.trim() || isUploading || isCompressing}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengupload... {uploadProgress}%
              </>
            ) : isCompressing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengkompres...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Publikasikan
              </>
            )}
          </Button>
          {isUploading && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-3"
            >
              Batal
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
