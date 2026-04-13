import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import DocumentComment from "@/app/models/documentComment";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
import { cookies } from "next/headers";

// Helper to get authenticated user from cookies
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
        name: customer.name || customer.email || 'Unknown',
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
        name: admin.name || admin.email || 'Unknown',
      };
    }
  }
  
  return null;
}

// GET /api/write/comments/:docId - Get all comments for a document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await connectDB();
    
    const { docId } = await params;
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
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
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    
    const query: any = { documentId: docId };
    if (status !== 'all') {
      query.status = status;
    }
    
    const comments = await DocumentComment.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    const commentMap = new Map();
    const rootComments: any[] = [];
    
    comments.forEach((comment) => {
      const formatted = {
        id: comment._id.toString(),
        documentId: comment.documentId,
        userId: comment.userId,
        userType: comment.userType,
        userName: comment.userName,
        userAvatar: comment.userAvatar,
        selectionRange: comment.selectionRange,
        content: comment.content,
        type: comment.type,
        status: comment.status,
        threadId: comment.threadId,
        parentId: comment.parentId,
        replyCount: comment.replyCount,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        resolvedAt: comment.resolvedAt,
        resolvedBy: comment.resolvedBy,
        replies: [],
      };
      
      commentMap.set(formatted.id, formatted);
      
      if (!comment.parentId) {
        rootComments.push(formatted);
      }
    });
    
    comments.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentMap.get(comment._id.toString()));
        }
      }
    });
    
    return NextResponse.json({ comments: rootComments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/write/comments/:docId - Add a new comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await connectDB();
    
    const { docId } = await params;
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType, name } = auth;
    
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    if (!doc.collaborationSettings?.allowComments) {
      return NextResponse.json({ error: "Comments are disabled" }, { status: 403 });
    }
    
    const body = await req.json();
    const { selectionRange, content, type, parentId } = body;
    
    if (!content || !selectionRange) {
      return NextResponse.json(
        { error: "Content and selection range are required" },
        { status: 400 }
      );
    }
    
    const threadId = parentId ? undefined : `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let parentThreadId = threadId;
    if (parentId) {
      const parent = await DocumentComment.findById(parentId).lean();
      if (!parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
      parentThreadId = parent.threadId;
      await DocumentComment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }
    
    const comment = await DocumentComment.create({
      documentId: docId,
      userId,
      userType,
      userName: name,
      selectionRange,
      content,
      type: type || 'comment',
      status: 'open',
      threadId: parentThreadId,
      parentId: parentId || undefined,
      replyCount: 0,
    });
    
    return NextResponse.json({
      success: true,
      comment: {
        id: comment._id.toString(),
        documentId: comment.documentId,
        userId: comment.userId,
        userType: comment.userType,
        userName: comment.userName,
        selectionRange: comment.selectionRange,
        content: comment.content,
        type: comment.type,
        status: comment.status,
        threadId: comment.threadId,
        parentId: comment.parentId,
        replyCount: comment.replyCount,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
