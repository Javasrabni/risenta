"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { MessageCircle, Eye, Trash2, Send, Pencil, MoreVertical, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// ─── Types ────────────────────────────────────────────────────────────────────
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

// parentReplyId: string  → reply ke reply tertentu
// parentReplyId: null   → reply langsung ke comment root
interface ReplyingState {
  commentId: string
  parentReplyId: string | null
  text: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function countAll(post: Post): number {
  let n = post.comments.length
  const rec = (replies: Reply[]) => {
    n += replies?.length ?? 0
    replies?.forEach((r) => rec(r.replies ?? []))
  }
  post.comments.forEach((c) => rec(c.replies ?? []))
  return n
}

// ─── PostsSection ─────────────────────────────────────────────────────────────
export function PostsSection() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editText, setEditText] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPosts()
    fetchCurrentUser()
  }, [])

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts")
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        if (data.admin) setCurrentUserId(data.admin._id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddComment = async (postId: string) => {
    const content = commentText[postId]?.trim()
    if (!content) return
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        setCommentText((p) => ({ ...p, [postId]: "" }))
        fetchPosts()
      }
    } catch (e) { console.error(e) }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus postingan ini?")) return
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" })
      if (res.ok) setPosts((p) => p.filter((x) => x._id !== postId))
    } catch (e) { console.error(e) }
  }

  const recordView = async (postId: string) => {
    try { await fetch(`/api/posts/${postId}`, { method: "PATCH" }) }
    catch (e) { console.error(e) }
  }

  const handleEditPost = async (postId: string, desc: string) => {
    if (!desc.trim()) return
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc.trim() }),
      })
      if (res.ok) { setEditingPost(null); fetchPosts() }
    } catch (e) { console.error(e) }
  }

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center gap-4 py-8">
        <div className="w-full max-w-md h-96 bg-gray-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
        <div className="w-full max-w-md h-96 bg-gray-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="w-full flex flex-col items-center gap-2 py-8 px-6 mb-16">
        <h1 className="pointer-events-none font-[inter] bg-linear-to-b from-black to-gray-300/80 bg-clip-text text-2xl lg:text-4xl leading-none font-semibold whitespace-pre-wrap text-transparent dark:from-white dark:to-slate-900/10 tracking-[-1px] pb-2">
          Postingan
        </h1>
        <p className="text-xs sm:text-sm text-center mt-0 max-w-sm text-slate-600 dark:text-white font-[inter] pb-4">
          Belum ada postingan. Klik tombol + di navbar untuk membuat postingan pertama!
        </p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-2 pb-8 mb-24 px-4">
      <div className="w-full max-w-md space-y-6">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            currentUserId={currentUserId}
            commentText={commentText[post._id] ?? ""}
            showComments={showComments[post._id] ?? false}
            onCommentChange={(t) => setCommentText((p) => ({ ...p, [post._id]: t }))}
            onToggleComments={() => setShowComments((p) => ({ ...p, [post._id]: !p[post._id] }))}
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
  )
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
interface PostCardProps {
  post: Post; currentUserId: string | null
  commentText: string; showComments: boolean
  onCommentChange: (t: string) => void; onToggleComments: () => void; onAddComment: () => void
  isEditing: boolean; editText: string
  onEditChange: (t: string) => void; onStartEdit: () => void; onCancelEdit: () => void; onEdit: (t: string) => void
  onDelete: () => void; onView: () => void; onRefresh: () => void
}

function PostCard({
  post, currentUserId, commentText, showComments,
  onCommentChange, onToggleComments, onAddComment,
  isEditing, editText, onEditChange, onStartEdit, onCancelEdit, onEdit,
  onDelete, onView, onRefresh,
}: PostCardProps) {
  const isAuthor = toStr(post.authorId) === toStr(currentUserId)
  const hasViewed = currentUserId ? post.views.includes(currentUserId) : false
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className="relative bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-neutral-800"
      onMouseEnter={() => !hasViewed && onView()}
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
        {post.mediaType === "video"
          ? <VideoPlayer src={post.mediaUrl} postId={post._id} />
          : <div className="relative w-full aspect-square"><Image src={post.mediaUrl} alt="Post media" fill className="object-contain" /></div>
        }
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
            <MessageCircle className="w-4 h-4" /><span>{countAll(post)}</span>
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
            post={post} currentUserId={currentUserId}
            commentText={commentText} onCommentChange={onCommentChange}
            onAddComment={onAddComment} onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  )
}

// ─── CommentSection ────────────────────────────────────────────────────────────
function CommentSection({
  post, currentUserId, commentText, onCommentChange, onAddComment, onRefresh,
}: {
  post: Post; currentUserId: string | null
  commentText: string; onCommentChange: (t: string) => void
  onAddComment: () => void; onRefresh: () => void
}) {
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

  // FIX BUG 2 ─ parentReplyId dikirim sebagai null (bukan undefined/string "undefined")
  // JSON.stringify({ a: undefined }) → "{}" ← field hilang, backend crash
  // JSON.stringify({ a: null })     → '{"a":null}' ← benar
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
          parentReplyId: replying.parentReplyId, // sudah null jika root, tidak akan di-drop JSON.stringify
        }),
      })
      if (res.ok) { setReplying(null); onRefresh() }
    } catch (e) { console.error(e) }
  }

  const sharedProps = {
    postId: post._id, currentUserId,
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

// ─── Shared tree props ────────────────────────────────────────────────────────
interface TreeProps {
  postId: string; currentUserId: string | null
  editing: EditingState | null; replying: ReplyingState | null
  setEditing: (v: EditingState | null) => void
  setReplying: React.Dispatch<React.SetStateAction<ReplyingState | null>>
  onSaveComment: (commentId: string, content: string) => void
  onDeleteComment: (commentId: string) => void
  onSaveReply: (commentId: string, replyId: string, content: string) => void
  onDeleteReply: (commentId: string, replyId: string) => void
  onSendReply: () => void
}

// ─── CommentRow ───────────────────────────────────────────────────────────────
//
//  Struktur visual (YouTube-style):
//
//  ┌──────────────────────────────────────┐
//  │ [Avatar]  Nama · waktu               │  ← flex row
//  │   │       Konten komentar            │
//  │   │       [Balas] [Edit] [Hapus]     │
//  │   │       [Reply input]              │
//  │   │                                  │
//  │   │  ┌─────────────────────────────┐ │  ← ReplyList
//  │   │  │ [Av] Nama · waktu           │ │
//  │   │  │  │   Konten reply           │ │
//  │   │  │  │   ...nested...           │ │
//  │   │  └─────────────────────────────┘ │
//  └──────────────────────────────────────┘
//
//  KUNCI FIX BUG 1:
//  - Rail kiri (kolom avatar) pakai `display:flex; flex-direction:column`
//  - Avatar di atas (fixed size), garis pakai `flex:1` → otomatis memanjang
//    mengikuti tinggi konten kanan (yang bisa berubah-ubah)
//  - Karena outer row juga flex-row, tinggi rail = tinggi konten kanan secara otomatis
//
function CommentRow({ comment, ...props }: { comment: Comment } & TreeProps) {
  const isAuthor = toStr(comment.authorId) === toStr(props.currentUserId)
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

      {/* Konten kanan: Nama + Date container */}
      <div className="flex-1 min-w-0 pt-3 pb-1">
        {/* Container Nama + Date */}
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

        {/* Edit form / konten */}
        {isEditing ? (
          <InlineEditForm
            initialText={props.editing!.text}
            onSave={(t) => props.onSaveComment(comment._id, t)}
            onCancel={() => props.setEditing(null)}
          />
        ) : (
          <p className="text-sm text-gray-800 dark:text-gray-100 break-words leading-relaxed">{comment.content}</p>
        )}

        {/* Aksi */}
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

        {/* Reply input */}
        {isReplying && (
          <ReplyInput
            placeholder="Balas komentar..."
            value={props.replying!.text}
            onChange={(t) => props.setReplying((p) => p ? { ...p, text: t } : null)}
            onSend={props.onSendReply}
            onCancel={() => props.setReplying(null)}
          />
        )}

        {/* Replies - Instagram style: flat list, bg biru hanya di parent content */}
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

// ─── ReplyItem (Instagram style - flat, bg biru di parent content) ────────────
interface ReplyItemProps extends TreeProps {
  reply: Reply
  commentId: string
  parentContent: string  // konten yang direply
}

function ReplyItem({ reply, commentId, parentContent, ...props }: ReplyItemProps) {
  const isReplyAuthor = toStr(reply.authorId) === toStr(props.currentUserId)
  const isEditing = props.editing?.type === "reply" && props.editing.replyId === reply._id
  const isReplying = props.replying?.commentId === commentId && props.replying?.parentReplyId === reply._id
  const hasNested = (reply.replies?.length ?? 0) > 0

  return (
    <div className="mb-4">
      {/* Flex row: Avatar container + Nama+Date container */}
      <div className="flex items-start gap-2 mb-2">
        {/* Avatar container */}
        <div className="flex-shrink-0">
          <div className="relative rounded-full overflow-hidden border border-gray-200 dark:border-neutral-600 flex-shrink-0" style={{ width: 28, height: 28 }}>
            <Image src={reply.authorPhoto ?? "/Assets/default-avatar.png"} alt={reply.authorName} fill className="object-cover" />
          </div>
        </div>
        {/* Nama + Date container */}
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

      {/* Background BIRU: isi komentar yang di-reply (tanpa border) */}
      <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
        <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-3">
          {parentContent}
        </p>
      </div>

      {/* Konten reply */}
      {isEditing ? (
        <InlineEditForm
          initialText={props.editing!.text}
          onSave={(t) => props.onSaveReply(commentId, reply._id, t)}
          onCancel={() => props.setEditing(null)}
        />
      ) : (
        <p className="text-sm text-gray-800 dark:text-gray-100 break-words leading-relaxed">{reply.content}</p>
      )}

      {/* Actions */}
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

      {/* Reply input */}
      {isReplying && (
        <ReplyInput
          placeholder={`Balas ${reply.authorName}...`}
          value={props.replying!.text}
          onChange={(t) => props.setReplying((p) => p ? { ...p, text: t } : null)}
          onSend={props.onSendReply}
          onCancel={() => props.setReplying(null)}
        />
      )}

      {/* Nested replies - Instagram style: flat list di bawah dengan gap */}
      {hasNested && (
        <div className="mt-4 space-y-4">
          {reply.replies.map((nestedReply) => (
            <ReplyItem
              key={nestedReply._id}
              reply={nestedReply}
              commentId={commentId}
              parentContent={reply.content}  // parent = reply ini
              {...props}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ReplyList (deprecated, diganti ReplyItem) ────────────────────────────────
function ReplyList({
  replies, commentId, ...props
}: { replies: Reply[]; commentId: string } & TreeProps) {
  // Fallback untuk backward compatibility - tidak digunakan lagi
  return (
    <div className="mt-2 space-y-4">
      {replies.map((reply) => (
        <ReplyItem
          key={reply._id}
          reply={reply}
          commentId={commentId}
          parentContent=""  // tidak ada konten parent untuk backward compat
          {...props}
        />
      ))}
    </div>
  )
}

// ─── InlineEditForm ───────────────────────────────────────────────────────────
function InlineEditForm({ initialText, onSave, onCancel }: {
  initialText: string; onSave: (t: string) => void; onCancel: () => void
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
  placeholder: string; value: string
  onChange: (t: string) => void; onSend: () => void; onCancel: () => void
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

// ─── VideoQueueManager ────────────────────────────────────────────────────────
class VideoQueueManager {
  private static instance: VideoQueueManager
  private queue: string[] = []
  private playing: string | null = null
  private cbs = new Map<string, { play: () => void; pause: () => void }>()

  static getInstance() {
    if (!VideoQueueManager.instance) VideoQueueManager.instance = new VideoQueueManager()
    return VideoQueueManager.instance
  }
  register(id: string, cb: { play: () => void; pause: () => void }) { this.cbs.set(id, cb) }
  unregister(id: string) {
    this.cbs.delete(id)
    const i = this.queue.indexOf(id); if (i > -1) this.queue.splice(i, 1)
    if (this.playing === id) { this.playing = null; this.next() }
  }
  entered(id: string) {
    if (!this.queue.includes(id)) this.queue.push(id)
    if (!this.playing) this.next()
  }
  left(id: string) {
    const i = this.queue.indexOf(id); if (i > -1) this.queue.splice(i, 1)
    if (this.playing === id) { this.playing = null; this.cbs.get(id)?.pause(); this.next() }
  }
  ended(id: string) {
    if (this.playing === id) {
      this.playing = null
      const i = this.queue.indexOf(id); if (i > -1) this.queue.splice(i, 1)
      this.next()
    }
  }
  private next() {
    if (!this.queue.length) return
    this.playing = this.queue[0]
    this.cbs.get(this.playing)?.play()
  }
}

const videoMgr = VideoQueueManager.getInstance()

// ─── VideoPlayer ──────────────────────────────────────────────────────────────
function VideoPlayer({ src, postId }: { src: string; postId: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [showUnmute, setShowUnmute] = useState(false)

  useEffect(() => {
    const v = ref.current; if (!v) return
    ;(async () => {
      try { v.muted = false; await v.play(); v.pause(); setMuted(false) }
      catch { v.muted = true; setMuted(true); setShowUnmute(true) }
    })()
    const enableSound = () => { if (v?.muted) { v.muted = false; setMuted(false); setShowUnmute(false) } }
    document.addEventListener("click", enableSound, { once: true })
    document.addEventListener("touchstart", enableSound, { once: true })
    videoMgr.register(postId, {
      play: () => { if (!v) return; v.muted = muted; v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}) }) },
      pause: () => v?.pause(),
    })
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting ? videoMgr.entered(postId) : videoMgr.left(postId)),
      { threshold: 0.5 }
    )
    obs.observe(v)
    const onEnded = () => videoMgr.ended(postId)
    v.addEventListener("ended", onEnded)
    return () => {
      obs.disconnect(); v.removeEventListener("ended", onEnded); videoMgr.unregister(postId)
      document.removeEventListener("click", enableSound); document.removeEventListener("touchstart", enableSound)
    }
  }, [postId, muted])

  return (
    <div className="relative w-full">
      <video ref={ref} src={src} className="w-full h-auto object-contain" controls playsInline preload="metadata" muted={muted} loop={false} />
      {showUnmute && (
        <button
          onClick={() => { const v = ref.current; if (v) { v.muted = false; setMuted(false); setShowUnmute(false) } }}
          className="absolute bottom-16 left-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2 hover:bg-black/80 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          Nyalakan suara
        </button>
      )}
    </div>
  )
}