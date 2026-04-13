import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import DocumentComment from "@/app/models/documentComment";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
import { cookies } from "next/headers";

// Helper to get authenticated user
async function getAuthenticatedUser(req: NextRequest) {
  const cookieStore = await cookies();
  
  const customerSession = cookieStore.get("customer_session")?.value;
  const customerId = cookieStore.get("customer_id")?.value;
  
  if (customerSession && customerId) {
    const customer = await Customer.findOne({ customerID: customerId }).lean();
    if (customer) {
      return {
        userId: customer._id?.toString() || customer.customerID,
        userType: 'customer' as const,
        user: customer,
      };
    }
  }
  
  const adminToken = cookieStore.get("session_token")?.value;
  if (adminToken) {
    const admin = await RisenttaAdm.findOne({ token: adminToken }).lean();
    if (admin) {
      return {
        userId: admin._id?.toString() || admin.risentaID,
        userType: 'admin' as const,
        user: admin,
      };
    }
  }
  
  return null;
}

// PATCH /api/write/comments/:docId/:commentId - Resolve or update comment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string; commentId: string }> }
) {
  try {
    await connectDB();
    
    const { docId, commentId } = await params;
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    // Check document access
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    const isOwner = doc.userId === userId && doc.userType === userType;
    const collaborator = await import("@/app/models/documentCollaborator").then(m => 
      m.default.findOne({ documentId: docId, userId, userType, isActive: true }).lean()
    );
    
    if (!isOwner && !collaborator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    const body = await req.json();
    const { status, content } = body;
    
    const comment = await DocumentComment.findById(commentId);
    if (!comment || comment.documentId !== docId) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    
    // Update fields
    if (status) {
      comment.status = status;
      if (status === 'resolved') {
        comment.resolvedAt = new Date();
        comment.resolvedBy = userId;
      }
    }
    
    if (content && (comment.userId === userId || isOwner)) {
      comment.content = content;
    }
    
    await comment.save();
    
    return NextResponse.json({
      success: true,
      comment: {
        id: comment._id.toString(),
        status: comment.status,
        resolvedAt: comment.resolvedAt,
        resolvedBy: comment.resolvedBy,
      },
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// DELETE /api/write/comments/:docId/:commentId - Delete comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string; commentId: string }> }
) {
  try {
    await connectDB();
    
    const { docId, commentId } = await params;
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    const comment = await DocumentComment.findById(commentId);
    if (!comment || comment.documentId !== docId) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    
    // Only comment owner or document owner can delete
    const doc = await Document.findById(docId).lean();
    const isOwner = doc?.userId === userId && doc?.userType === userType;
    
    if (comment.userId !== userId && !isOwner) {
      return NextResponse.json({ error: "Cannot delete this comment" }, { status: 403 });
    }
    
    await DocumentComment.findByIdAndDelete(commentId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
