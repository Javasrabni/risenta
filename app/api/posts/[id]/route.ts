import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/app/models/post";
import { cookies } from "next/headers";
import RisentaAdm from "@/app/models/risentaAdm";
import mongoose from "mongoose";

// ─── Helper: Auth check ───────────────────────────────────────────────────────
async function getAuthAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;
  return await RisentaAdm.findOne({ token: sessionToken });
}

// ─── Helper: Find reply recursively di dalam nested replies ──────────────────
function findReplyById(replies: any[], replyId: string): any | null {
  for (const reply of replies) {
    if (reply._id?.toString() === replyId) return reply;
    if (reply.replies?.length) {
      const found = findReplyById(reply.replies, replyId);
      if (found) return found;
    }
  }
  return null;
}

// ─── Helper: Delete reply recursively ────────────────────────────────────────
function deleteReplyById(replies: any[], replyId: string): boolean {
  const index = replies.findIndex((r: any) => r._id?.toString() === replyId);
  if (index !== -1) {
    replies.splice(index, 1);
    return true;
  }
  for (const reply of replies) {
    if (reply.replies?.length) {
      const deleted = deleteReplyById(reply.replies, replyId);
      if (deleted) return true;
    }
  }
  return false;
}

// ─── POST - Add comment ───────────────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ message: "Isi komentar wajib diisi" }, { status: 400 });
    }

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ message: "Post tidak ditemukan" }, { status: 404 });
    }

    post.comments.push({
      authorId: admin.risentaID,
      authorName: admin.adm_usn,
      authorPhoto: admin.photoProfile,
      content: content.trim(),
      createdAt: new Date(),
      replies: [],
    });

    await post.save();
    return NextResponse.json({ message: "Komentar berhasil ditambahkan", post }, { status: 200 });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json({ message: "Gagal menambahkan komentar" }, { status: 500 });
  }
}

// ─── PUT - Edit post description / comment / reply ───────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { commentId, replyId, content, action, description } = body;

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ message: "Post tidak ditemukan" }, { status: 404 });
    }

    // ── Edit / Delete REPLY ──────────────────────────────────────────────────
    if (replyId && commentId) {
      const comment = post.comments.id(commentId);
      if (!comment) {
        return NextResponse.json({ message: "Komentar tidak ditemukan" }, { status: 404 });
      }

      if (action === "deleteReply") {
        // Cari dan hapus reply secara rekursif
        const deleted = deleteReplyById(comment.replies, replyId);
        if (!deleted) {
          return NextResponse.json({ message: "Balasan tidak ditemukan" }, { status: 404 });
        }
        await post.save();
        return NextResponse.json({ message: "Balasan berhasil dihapus", post }, { status: 200 });
      }

      // Edit reply
      const reply = findReplyById(comment.replies, replyId);
      if (!reply) {
        return NextResponse.json({ message: "Balasan tidak ditemukan" }, { status: 404 });
      }

      // Cek ownership menggunakan risentaID atau _id (fallback untuk data lama)
      const isOwner = reply.authorId === admin.risentaID || reply.authorId === admin._id.toString();
      if (!isOwner) {
        return NextResponse.json({ message: "Bukan pemilik balasan ini" }, { status: 403 });
      }

      if (!content?.trim()) {
        return NextResponse.json({ message: "Isi balasan wajib diisi" }, { status: 400 });
      }

      reply.content = content.trim();
      reply.updatedAt = new Date();
      await post.save();
      return NextResponse.json({ message: "Balasan berhasil diperbarui", post }, { status: 200 });
    }

    // ── Edit / Delete COMMENT ────────────────────────────────────────────────
    if (commentId) {
      const comment = post.comments.id(commentId);
      if (!comment) {
        return NextResponse.json({ message: "Komentar tidak ditemukan" }, { status: 404 });
      }

      // Cek ownership menggunakan risentaID atau _id (fallback untuk data lama)
      const isOwner = comment.authorId === admin.risentaID || comment.authorId === admin._id.toString();
      if (!isOwner) {
        return NextResponse.json({ message: "Bukan pemilik komentar ini" }, { status: 403 });
      }

      if (action === "delete") {
        post.comments = post.comments.filter(
          (c: any) => c._id?.toString() !== commentId
        );
        await post.save();
        return NextResponse.json({ message: "Komentar berhasil dihapus", post }, { status: 200 });
      }

      if (!content?.trim()) {
        return NextResponse.json({ message: "Isi komentar wajib diisi" }, { status: 400 });
      }

      comment.content = content.trim();
      comment.updatedAt = new Date();
      await post.save();
      return NextResponse.json({ message: "Komentar berhasil diperbarui", post }, { status: 200 });
    }

    // ── Edit POST description ────────────────────────────────────────────────
    if (!description?.trim()) {
      return NextResponse.json({ message: "Deskripsi wajib diisi" }, { status: 400 });
    }

    // Cek ownership post (pakai _id atau risentaID untuk kompatibilitas data lama)
    const isPostOwner = post.authorId?.toString() === admin._id.toString() || 
                        post.authorId?.toString() === admin.risentaID;
    if (!isPostOwner) {
      return NextResponse.json({ message: "Bukan pemilik post ini" }, { status: 403 });
    }

    post.description = description.trim();
    await post.save();
    return NextResponse.json({ message: "Post berhasil diperbarui", post }, { status: 200 });
  } catch (error) {
    console.error("Error updating:", error);
    return NextResponse.json({ message: "Gagal memperbarui" }, { status: 500 });
  }
}

// ─── PATCH - Add reply / Record view ─────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, commentId, content, parentReplyId } = body;

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ message: "Post tidak ditemukan" }, { status: 404 });
    }

    // ── Add reply ────────────────────────────────────────────────────────────
    if (action === "reply" && commentId && content?.trim()) {
      const replyData = {
        _id: new mongoose.Types.ObjectId(),
        authorId: admin.risentaID,
        authorName: admin.adm_usn,
        authorPhoto: admin.photoProfile,
        content: content.trim(),
        createdAt: new Date(),
        parentReplyId: parentReplyId || null,
        replies: [],
      };

      const comment = post.comments.id(commentId);
      if (!comment) {
        return NextResponse.json({ message: "Komentar tidak ditemukan" }, { status: 404 });
      }

      if (parentReplyId) {
        // Nested reply — cari parent reply secara rekursif
        const parentReply = findReplyById(comment.replies, parentReplyId);
        if (!parentReply) {
          return NextResponse.json({ message: "Balasan induk tidak ditemukan" }, { status: 404 });
        }
        if (!parentReply.replies) parentReply.replies = [];
        parentReply.replies.push(replyData);
      } else {
        // Direct reply ke comment
        if (!comment.replies) comment.replies = [];
        comment.replies.push(replyData);
      }

      await post.save();
      return NextResponse.json({ message: "Balasan berhasil ditambahkan", post }, { status: 200 });
    }

    // ── Record view ───────────────────────────────────────────────────────────
    const adminId = admin._id.toString();
    if (!post.views.includes(adminId)) {
      post.views.push(adminId);
      await post.save();
    }

    return NextResponse.json({ message: "View tercatat", views: post.views.length }, { status: 200 });
  } catch (error) {
    console.error("Error in PATCH:", error);
    return NextResponse.json({ message: "Gagal memproses permintaan" }, { status: 500 });
  }
}

// ─── DELETE - Delete post ─────────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ message: "Post tidak ditemukan" }, { status: 404 });
    }

    if (post.authorId?.toString() !== admin._id.toString()) {
      return NextResponse.json({ message: "Bukan pemilik post ini" }, { status: 403 });
    }

    // Hapus dari Cloudinary
    const { v2: cloudinary } = require("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET_KEY,
    });

    await cloudinary.uploader.destroy(post.mediaPublicId, {
      resource_type: post.mediaType,
    });

    await Post.findByIdAndDelete(id);
    return NextResponse.json({ message: "Post berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ message: "Gagal menghapus post" }, { status: 500 });
  }
}